import SwiftUI
import WebKit
import AVFoundation
import os

/// The game is the web page bundled in Web/ (index.html, img/, levels/ with each song's parts). It is served through
/// the app's own scheme, bs://game/..., so the page can fetch its level files and audio like it does from a web server,
/// and its saves (localStorage) belong to one fixed origin. Bundled only: the app plays the same build with or without
/// a connection. Launch argument -qa: the page reports through window.webkit.messageHandlers.qa.
struct GameView: UIViewRepresentable {
    static let page = URL(string: "bs://game/index.html")!

    func makeCoordinator() -> Bridge { Bridge() }

    func makeUIView(context: Context) -> WKWebView {
        // the song plays even with the ring switch on silent, and mixes with what the player already has playing
        // (Creative lead's sound audit, 2026-11-25); the game's own Sound and Music switches mute effects and the song
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        let config = WKWebViewConfiguration()
        let content = WKUserContentController()
        content.add(context.coordinator, name: "qa")
        content.addUserScript(WKUserScript(source: "window.__app=1;" + Bridge.safeScript(nil), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if ProcessInfo.processInfo.arguments.contains("-qa") { // simulator check only: open the map, start stop 1, report
            content.addUserScript(WKUserScript(source: Bridge.qaScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        config.userContentController = content
        config.setURLSchemeHandler(BundleFiles(), forURLScheme: "bs")
        config.suppressesIncrementalRendering = true
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(named: "LaunchBg")
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        let scroll = web.scrollView
        scroll.isScrollEnabled = false
        scroll.bounces = false
        scroll.alwaysBounceVertical = false
        scroll.alwaysBounceHorizontal = false
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.pinchGestureRecognizer?.isEnabled = false
        scroll.panGestureRecognizer.isEnabled = false
        scroll.delaysContentTouches = false
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        web.navigationDelegate = context.coordinator
        context.coordinator.web = web
        context.coordinator.observeInterruptions()
        web.load(URLRequest(url: GameView.page))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Bridge) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "qa")
    }
}

/// Serves the files in the app's Web folder at bs://game/...
final class BundleFiles: NSObject, WKURLSchemeHandler {
    private static let types = ["html": "text/html", "js": "text/javascript", "css": "text/css", "json": "application/json",
                                "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "mp3": "audio/mpeg",
                                "m4a": "audio/mp4", "woff2": "font/woff2", "svg": "image/svg+xml"]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let root = Bundle.main.resourceURL?.appendingPathComponent("Web").standardizedFileURL else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let type = Self.types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = ["Content-Type": type.hasPrefix("text/") ? type + "; charset=utf-8" : type,
                       "Content-Length": String(data.count), "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class Bridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    private let log = Logger(subsystem: "com.vyassathya.bandsurvivors", category: "qa")
    weak var web: WKWebView?
    private var interruption: NSObjectProtocol?

    static let qaScript = """
    (function(){var say=function(t){try{window.webkit.messageHandlers.qa.postMessage(t)}catch(e){}};
    setTimeout(function(){var n=0,t=setInterval(function(){var b=document.querySelector('#bStart');if(++n>80){clearInterval(t);say('QA_FAIL start never enabled');return;}
    if(!b||b.disabled)return;clearInterval(t);b.click();say('QA map shown');
    setTimeout(function(){say('QA loading stop 1');window.__bs.play(0).then(function(){setTimeout(function(){var s=window.__bs;
    say('QA_RUN mode='+s.S.mode+' t='+Math.round(s.S.t)+' band='+s.band.length+' enemies='+s.enemies.length+' audio='+s.ctx().state+' rate='+s.ctx().sampleRate+' lead_gain='+s.layerGain('voice_lead')+' fires='+s.fireLog.length);},9000);})
    .catch(function(e){say('QA_FAIL '+e);});},2500);},300);},6000);})();
    """

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let text = message.body as? String { log.notice("REUQA \(text, privacy: .public)") }
    }

    /// After a call, Siri or an alarm the page's audio is suspended; tell the page so it can resume its AudioContext.
    func observeInterruptions() {
        interruption = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
            try? AVAudioSession.sharedInstance().setActive(true)
            // the page's AudioContext is reached through its test hook window.__bs.ctx(); paused games stay paused
            self?.web?.evaluateJavaScript("try{var b=window.__bs,c=b&&b.ctx();if(c&&c.state!=='running'&&b.S.mode!=='pause')c.resume();}catch(e){}")
        }
    }

    /// The web view fills the whole screen, so the page's own safe-area values are 0; the window knows the real ones.
    static func safeScript(_ view: UIView?) -> String {
        let window = view?.window ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }.flatMap { $0.windows }.first
        let i = window?.safeAreaInsets ?? .zero
        return "window.__safe={top:\(Double(i.top)),bottom:\(Double(i.bottom))};"
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        log.notice("REUQA NAV finish")
        webView.evaluateJavaScript(Bridge.safeScript(webView) + "window.dispatchEvent(new Event('resize'));")
    }

    /// The page's process can be ended by the system; without this the screen stays empty until the app is closed.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        log.notice("REUQA NAV page process ended, loading again")
        webView.load(URLRequest(url: GameView.page))
    }
}
