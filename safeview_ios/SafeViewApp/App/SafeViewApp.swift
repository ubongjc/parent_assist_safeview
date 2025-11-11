import SwiftUI

@main
struct SafeViewApp: App {
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var sessionManager = SessionManager.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .environmentObject(sessionManager)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                if let activeRoom = sessionManager.activeRoom {
                    ActiveSessionView(room: activeRoom)
                } else {
                    MainView()
                }
            } else {
                SignInView()
            }
        }
    }
}
