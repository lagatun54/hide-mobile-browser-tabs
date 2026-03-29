import SwiftUI
import WebKit

/// Оболочка WKWebView: element fullscreen + лог `fullscreenState` (как в нативном примере).
struct WebShellView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        // Element fullscreen по-прежнему запрашивается из JS (webkitRequestFullscreen / requestFullscreen на узле).
        // Здесь только разрешение со стороны WKWebView; см. main.js при __WK_SHELL_ELEMENT_FULLSCREEN__.
        if #available(iOS 15.4, *) {
            config.defaultWebpagePreferences.isElementFullscreenEnabled = true
        }

        let shellFlag = "window.__WK_SHELL_ELEMENT_FULLSCREEN__=true;"
        let shellScript = WKUserScript(
            source: shellFlag,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(shellScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        context.coordinator.observeFullscreenState(webView)

        if let www = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) {
            let html = www.appendingPathComponent("index.html")
            if FileManager.default.fileExists(atPath: html.path) {
                webView.loadFileURL(html, allowingReadAccessTo: www)
                return webView
            }
        }

        let hint =
            "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\">"
            + "<style>body{font:16px system-ui;padding:16px;background:#111;color:#eee}</style></head><body>"
            + "<p>Соберите веб и скопируйте в бандл:</p><pre>npm run build\nios/sync-www.sh</pre>"
            + "<p>Потом пересоберите проект в Xcode.</p></body></html>"
        webView.loadHTMLString(hint, baseURL: nil)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private var fullscreenObservation: NSKeyValueObservation?

        func observeFullscreenState(_ webView: WKWebView) {
            fullscreenObservation = webView.observe(\.fullscreenState, options: [.new]) { object, change in
                let newVal = change.newValue.map { String(describing: $0) } ?? "nil"
                print("fullscreenState: new=\(newVal) current=\(String(describing: object.fullscreenState))")
            }
        }
    }
}
