import SwiftUI

@main
struct FullscreenShellApp: App {
    var body: some Scene {
        WindowGroup {
            WebShellView()
                .ignoresSafeArea()
        }
    }
}
