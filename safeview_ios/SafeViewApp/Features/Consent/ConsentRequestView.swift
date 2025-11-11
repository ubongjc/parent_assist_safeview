import SwiftUI

struct ConsentRequestView: View {
    let room: Room
    let consent: Consent

    @EnvironmentObject var sessionManager: SessionManager
    @Environment(\.dismiss) var dismiss

    @State private var isProcessing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "person.badge.shield.checkmark.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)

                    Text("Remote Assistance Request")
                        .font(.title.bold())

                    Text("Someone wants to help you with your device")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)

                // Requester Info
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.blue)

                        VStack(alignment: .leading) {
                            Text(room.inviter?.name ?? "Helper")
                                .font(.headline)
                            if let email = room.inviter?.email {
                                Text(email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    if let message = consent.message {
                        Text(message)
                            .font(.body)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(12)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.gray.opacity(0.05))
                .cornerRadius(16)

                // What This Allows
                InfoCard(
                    title: "What this allows",
                    icon: "checkmark.circle.fill",
                    color: .blue,
                    items: [
                        "View your screen in real-time",
                        "Provide guidance and support",
                        "Auto-redact sensitive information"
                    ]
                )

                // Your Safety
                InfoCard(
                    title: "Your safety",
                    icon: "shield.fill",
                    color: .green,
                    items: [
                        "You can end the session at ANY time",
                        "Session expires in \(timeRemaining)",
                        "All actions are logged for security"
                    ]
                )

                Spacer()

                // Action Buttons
                VStack(spacing: 12) {
                    Button(action: handleGrant) {
                        HStack {
                            if isProcessing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            }
                            Text(isProcessing ? "Processing..." : "Grant Access")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isProcessing)

                    Button(action: handleDeny) {
                        Text("Deny")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .foregroundColor(.primary)
                            .cornerRadius(12)
                    }
                    .disabled(isProcessing)
                }
            }
            .padding()
        }
    }

    private var timeRemaining: String {
        let remaining = max(0, consent.expiresAt.timeIntervalSinceNow)
        let minutes = Int(remaining) / 60
        return "\(minutes) minutes"
    }

    private func handleGrant() {
        isProcessing = true
        Task {
            await sessionManager.joinRoom(roomId: room.id, consentGranted: true)
            isProcessing = false
            dismiss()
        }
    }

    private func handleDeny() {
        isProcessing = true
        Task {
            await sessionManager.joinRoom(roomId: room.id, consentGranted: false)
            isProcessing = false
            dismiss()
        }
    }
}

struct InfoCard: View {
    let title: String
    let icon: String
    let color: Color
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .top, spacing: 8) {
                        Text("•")
                        Text(item)
                            .font(.subheadline)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.1))
        .cornerRadius(16)
    }
}
