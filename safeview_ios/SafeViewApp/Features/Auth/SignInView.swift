import SwiftUI

struct SignInView: View {
    @EnvironmentObject var authManager: AuthenticationManager

    @State private var email = ""
    @State private var isLoading = false
    @State private var showMagicLinkSent = false

    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()

                // Logo and Title
                VStack(spacing: 16) {
                    Image(systemName: "hand.raised.shield.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)

                    Text("SafeView")
                        .font(.largeTitle.bold())

                    Text("Safe, consent-based remote assistance")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                // Sign In Options
                VStack(spacing: 16) {
                    // Passkey Sign In (Primary)
                    Button(action: handlePasskeySignIn) {
                        HStack {
                            Image(systemName: "key.fill")
                            Text("Sign in with Passkey")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading)

                    Text("or")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    // Magic Link (Fallback)
                    VStack(spacing: 12) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(12)

                        Button(action: handleMagicLink) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                }
                                Text(isLoading ? "Sending..." : "Send Magic Link")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(email.isEmpty || isLoading)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()

                // Privacy Notice
                Text("Your privacy and security are our top priority")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 32)
            }
            .navigationBarHidden(true)
        }
        .alert("Magic Link Sent", isPresented: $showMagicLinkSent) {
            Button("OK") {}
        } message: {
            Text("Check your email for a sign-in link. The link will expire in 15 minutes.")
        }
    }

    private func handlePasskeySignIn() {
        isLoading = true
        Task {
            do {
                try await authManager.signInWithPasskey()
            } catch {
                print("Passkey sign in failed: \(error)")
            }
            isLoading = false
        }
    }

    private func handleMagicLink() {
        isLoading = true
        Task {
            do {
                try await authManager.sendMagicLink(email: email)
                showMagicLinkSent = true
            } catch {
                print("Magic link failed: \(error)")
            }
            isLoading = false
        }
    }
}
