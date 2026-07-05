package io.github.dmitryminchuk.spacewarrior;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;

/**
 * Thin fullscreen WebView shell around the single-file HTML build.
 *
 * Android's WebView has no Gamepad API, so this activity intercepts
 * gamepad KeyEvents/MotionEvents and mirrors them into the page through
 * {@code window.__spaceWarriorPad(axisX, axisY, buttonsBitmask)} using the
 * W3C standard-mapping button order. TV-remote D-pad events are NOT
 * intercepted — the WebView translates them to Arrow/Enter key events that
 * the game's keyboard handler already understands.
 *
 * Back button: short press pauses the game (injects Escape), holding it
 * for ~1.2 s quits the app.
 */
public class MainActivity extends Activity {
    private static final String TAG = "SpaceWarrior";
    // Any https origin works as long as we serve it ourselves below; a fixed
    // dummy host keeps the game in a secure context without INTERNET access.
    private static final String GAME_HOST = "appassets.androidx.dev";
    private static final String GAME_URL = "https://" + GAME_HOST + "/assets/index.html";
    private static final long BACK_EXIT_HOLD_MS = 1200;

    private WebView webView;

    // Standard-mapping bitmask (bit N = button N). The page pulls this state
    // once per frame through the PadBridge instead of us pushing every event:
    // an evaluateJavascript per stick MotionEvent floods the render process
    // with IPC and adds visible input lag on weak TV boxes.
    private volatile int padButtons = 0;
    private volatile float padX = 0f;
    private volatile float padY = 0f;
    private boolean backHandledAsExit = false;

    /** Exposed to the page as window.__nativePadBridge (called off the UI thread). */
    private final class PadBridge {
        @JavascriptInterface
        public String poll() {
            return padX + "," + padY + "," + padButtons;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();

        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        // Web Audio must start without a click: the only "gesture" on TV may
        // be a remote key that the page sees too late for autoplay policy.
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.setBackgroundColor(0xFF000000);
        // Debug builds only: exposes the page to chrome://inspect / CDP for
        // on-device profiling. Use `gradlew assembleDebug` when diagnosing.
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serveAsset(request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "page finished: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                Log.e(TAG, "load error " + error.getErrorCode() + " " + error.getDescription()
                        + " for " + request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                Log.i(TAG, "console [" + msg.messageLevel() + "] " + msg.message()
                        + " (" + msg.sourceId() + ":" + msg.lineNumber() + ")");
                return true;
            }
        });

        webView.addJavascriptInterface(new PadBridge(), "__nativePadBridge");

        setContentView(webView);
        webView.requestFocus();
        webView.loadUrl(GAME_URL);
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        webView.pauseTimers();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.resumeTimers();
        webView.onResume();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        boolean down = event.getAction() == KeyEvent.ACTION_DOWN;

        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (down && event.getRepeatCount() > 0 && !backHandledAsExit
                    && event.getEventTime() - event.getDownTime() >= BACK_EXIT_HOLD_MS) {
                backHandledAsExit = true;
                finish();
            } else if (!down) {
                if (backHandledAsExit) {
                    backHandledAsExit = false;
                } else {
                    injectKey("Escape", true);
                    injectKey("Escape", false);
                }
            }
            return true;
        }

        int bit = gamepadButtonBit(keyCode);
        if (bit >= 0 && isGamepadEvent(event)) {
            int mask = 1 << bit;
            padButtons = down ? (padButtons | mask) : (padButtons & ~mask);
            return true;
        }

        // The WebView does not translate remote/keyboard KeyEvents into DOM
        // events on a canvas-only page, so mirror them into the page manually.
        String code = domCode(keyCode);
        if (code != null) {
            if (event.getRepeatCount() == 0 || !down) injectKey(code, down);
            return true;
        }

        return super.dispatchKeyEvent(event);
    }

    /** DOM KeyboardEvent.code for keys the game understands. */
    private static String domCode(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP: return "ArrowUp";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "ArrowDown";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "ArrowLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "ArrowRight";
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER: return "Enter";
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE: return "MediaPlayPause";
            case KeyEvent.KEYCODE_SPACE: return "Space";
            case KeyEvent.KEYCODE_W: return "KeyW";
            case KeyEvent.KEYCODE_A: return "KeyA";
            case KeyEvent.KEYCODE_S: return "KeyS";
            case KeyEvent.KEYCODE_D: return "KeyD";
            case KeyEvent.KEYCODE_X: return "KeyX";
            case KeyEvent.KEYCODE_P: return "KeyP";
            case KeyEvent.KEYCODE_SHIFT_LEFT: return "ShiftLeft";
            case KeyEvent.KEYCODE_SHIFT_RIGHT: return "ShiftRight";
            case KeyEvent.KEYCODE_DEL: return "Backspace";
            case KeyEvent.KEYCODE_ESCAPE: return "Escape";
            default: return null;
        }
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK) != 0
                && event.getAction() == MotionEvent.ACTION_MOVE) {
            padX = event.getAxisValue(MotionEvent.AXIS_X);
            padY = event.getAxisValue(MotionEvent.AXIS_Y);

            // Most controllers report the D-pad as hat axes and triggers as
            // analog axes rather than key events.
            float hatX = event.getAxisValue(MotionEvent.AXIS_HAT_X);
            float hatY = event.getAxisValue(MotionEvent.AXIS_HAT_Y);
            float lt = Math.max(event.getAxisValue(MotionEvent.AXIS_LTRIGGER),
                    event.getAxisValue(MotionEvent.AXIS_BRAKE));
            float rt = Math.max(event.getAxisValue(MotionEvent.AXIS_RTRIGGER),
                    event.getAxisValue(MotionEvent.AXIS_GAS));

            int next = padButtons;
            next = setBit(next, 12, hatY < -0.5f);
            next = setBit(next, 13, hatY > 0.5f);
            next = setBit(next, 14, hatX < -0.5f);
            next = setBit(next, 15, hatX > 0.5f);
            next = setBit(next, 6, lt > 0.5f);
            next = setBit(next, 7, rt > 0.5f);
            padButtons = next;
            return true;
        }
        return super.dispatchGenericMotionEvent(event);
    }

    /** Serves https://GAME_HOST/assets/* straight from the APK's assets. */
    private WebResourceResponse serveAsset(WebResourceRequest request) {
        if (!GAME_HOST.equals(request.getUrl().getAuthority())) return null;
        String path = request.getUrl().getPath();
        if (path == null || !path.startsWith("/assets/")) return null;
        String assetPath = path.substring("/assets/".length());
        try {
            InputStream stream = getAssets().open(assetPath);
            String mime = assetPath.endsWith(".html") ? "text/html" : "application/octet-stream";
            return new WebResourceResponse(mime, "utf-8", stream);
        } catch (IOException e) {
            Log.e(TAG, "asset not found: " + assetPath);
            return null;
        }
    }

    private static int setBit(int mask, int bit, boolean on) {
        return on ? (mask | (1 << bit)) : (mask & ~(1 << bit));
    }

    private static boolean isGamepadEvent(KeyEvent event) {
        return (event.getSource()
                & (InputDevice.SOURCE_GAMEPAD | InputDevice.SOURCE_JOYSTICK)) != 0;
    }

    /** Maps Android gamepad keycodes onto W3C standard-mapping button indices. */
    private static int gamepadButtonBit(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_L2: return 6;
            case KeyEvent.KEYCODE_BUTTON_R2: return 7;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
            default: return -1;
        }
    }

    private void injectKey(String code, boolean down) {
        webView.evaluateJavascript(
                "window.dispatchEvent(new KeyboardEvent('" + (down ? "keydown" : "keyup")
                        + "',{code:'" + code + "'}))",
                null);
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
}
