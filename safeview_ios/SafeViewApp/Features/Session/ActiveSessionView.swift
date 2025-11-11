import SwiftUI

struct ActiveSessionView: View {
    let room: Room

    @EnvironmentObject var sessionManager: SessionManager
    @State private var showEndConfirmation = false
    @State private var timeRemaining: TimeInterval = 0

    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            // Main Content
            VStack(spacing: 0) {
                // Status Bar
                statusBar

                // Session Info
                ScrollView {
                    VStack(spacing: 24) {
                        sessionInfoCard
                        safetyReminderCard
                        endSessionCard
                    }
                    .padding()
                }

                Spacer()
            }

            // Floating END Button (always visible)
            VStack {
                Spacer()
                bigEndButton
                    .padding(.bottom, 40)
            }
        }
        .onReceive(timer) { _ in
            updateTimeRemaining()
        }
        .alert("End Session?", isPresented: $showEndConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("End Session", role: .destructive) {
                Task {
                    await sessionManager.endSession(
                        roomId: room.id,
                        reason: "User ended session"
                    )
                }
            }
        } message: {
            Text("Are you sure you want to end this assistance session? This will immediately stop screen sharing.")
        }
    }

    // MARK: - Components

    private var statusBar: some View {
        HStack {
            Circle()
                .fill(Color.green)
                .frame(width: 12, height: 12)

            Text("Active Session")
                .font(.headline)
                .foregroundColor(.green)

            Spacer()

            Text(formatDuration(sessionManager.sessionDuration))
                .font(.system(.body, design: .monospaced))
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.green.opacity(0.1))
    }

    private var sessionInfoCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title)
                    .foregroundColor(.blue)

                VStack(alignment: .leading) {
                    Text("Helper")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(room.inviter?.name ?? "Unknown")
                        .font(.headline)
                }

                Spacer()
            }

            Divider()

            HStack {
                VStack(alignment: .leading) {
                    Text("Session Duration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(formatDuration(sessionManager.sessionDuration))
                        .font(.system(.title3, design: .monospaced))
                        .bold()
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("Time Remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(formatDuration(timeRemaining))
                        .font(.system(.title3, design: .monospaced))
                        .bold()
                        .foregroundColor(timeRemaining < 300 ? .orange : .primary)
                }
            }

            if timeRemaining < 300 {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Session expiring soon")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
                .padding(8)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(16)
    }

    private var safetyReminderCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "shield.checkmark.fill")
                    .foregroundColor(.green)
                Text("You are in control")
                    .font(.headline)
            }

            Text("Tap the big red END SESSION button below at any time to immediately stop screen sharing and revoke access. You don't need to give a reason.")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Divider()

            HStack(spacing: 8) {
                Circle()
                    .fill(Color.red)
                    .frame(width: 8, height: 8)

                Text("Session is being logged for your security")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.green.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.green.opacity(0.3), lineWidth: 1)
        )
    }

    private var endSessionCard: some View {
        VStack(spacing: 12) {
            Text("Need to end the session?")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button(action: { showEndConfirmation = true }) {
                Text("End Session")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .foregroundColor(.primary)
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(16)
    }

    private var bigEndButton: some View {
        Button(action: { showEndConfirmation = true }) {
            HStack(spacing: 12) {
                Image(systemName: "stop.circle.fill")
                    .font(.title2)
                Text("END SESSION")
                    .font(.title3.bold())
            }
            .foregroundColor(.white)
            .padding(.horizontal, 40)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.red)
                    .shadow(color: .red.opacity(0.5), radius: 20, x: 0, y: 10)
            )
        }
        .scaleEffect(sessionManager.isLoading ? 0.95 : 1.0)
        .animation(.spring(response: 0.3), value: sessionManager.isLoading)
    }

    // MARK: - Helpers

    private func updateTimeRemaining() {
        guard let expiresAt = room.expiresAt else {
            timeRemaining = 0
            return
        }
        timeRemaining = max(0, expiresAt.timeIntervalSinceNow)
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
