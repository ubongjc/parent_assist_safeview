import SwiftUI

struct MainView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var sessionManager: SessionManager

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                if !sessionManager.pendingConsents.isEmpty {
                    // Show pending consents
                    ForEach(sessionManager.pendingConsents) { consent in
                        if let room = getRoomForConsent(consent) {
                            NavigationLink(destination: ConsentRequestView(room: room, consent: consent)) {
                                PendingConsentCard(consent: consent)
                            }
                        }
                    }
                }

                Spacer()

                // Main Actions
                VStack(spacing: 16) {
                    Image(systemName: "hand.raised.shield.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)

                    Text("SafeView")
                        .font(.largeTitle.bold())

                    Text("Ready to assist or receive help")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Home")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: SettingsView()) {
                        Image(systemName: "gearshape.fill")
                    }
                }
            }
            .task {
                await sessionManager.fetchPendingConsents()
            }
        }
    }

    private func getRoomForConsent(_ consent: Consent) -> Room? {
        // In a real app, fetch the room details
        // For now, return nil
        return nil
    }
}

struct PendingConsentCard: View {
    let consent: Consent

    var body: some View {
        HStack {
            Image(systemName: "bell.badge.fill")
                .font(.title2)
                .foregroundColor(.blue)

            VStack(alignment: .leading) {
                Text("Assistance Request")
                    .font(.headline)
                Text("Tap to review")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }
}

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager

    var body: some View {
        List {
            Section("Account") {
                if let user = authManager.currentUser {
                    HStack {
                        Text("Name")
                        Spacer()
                        Text(user.name ?? "Not set")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Email")
                        Spacer()
                        Text(user.email)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section("Privacy & Security") {
                NavigationLink("Redaction Rules") {
                    Text("Configure auto-redaction rules")
                }
                NavigationLink("Session History") {
                    Text("View past sessions")
                }
            }

            Section {
                Button("Sign Out") {
                    authManager.signOut()
                }
                .foregroundColor(.red)
            }
        }
        .navigationTitle("Settings")
    }
}
