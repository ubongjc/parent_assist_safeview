import Foundation
import Combine

@MainActor
class SessionManager: ObservableObject {
    static let shared = SessionManager()

    @Published var activeRoom: Room?
    @Published var pendingConsents: [Consent] = []
    @Published var sessionDuration: TimeInterval = 0
    @Published var isLoading = false
    @Published var error: String?

    private var timer: Timer?
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Room Management
    func createRoom(inviteeId: String, durationMinutes: Int, message: String?) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiClient.createRoom(
                inviteeId: inviteeId,
                durationMinutes: durationMinutes,
                message: message
            )

            // Room created successfully
            print("Room created: \(response.room.id)")
        } catch {
            self.error = "Failed to create room: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func joinRoom(roomId: String, consentGranted: Bool) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiClient.joinRoom(
                roomId: roomId,
                consentGranted: consentGranted
            )

            if consentGranted {
                self.activeRoom = response.room
                startSessionTimer()
            }
        } catch {
            self.error = "Failed to join room: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func endSession(roomId: String, reason: String? = nil) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiClient.endRoom(
                roomId: roomId,
                reason: reason
            )

            stopSessionTimer()
            self.activeRoom = nil
            print("Session ended: \(response.message)")
        } catch {
            self.error = "Failed to end session: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func fetchPendingConsents() async {
        do {
            let response = try await apiClient.listRooms(status: .pending)
            self.pendingConsents = response.rooms.compactMap { $0.consents?.first }
        } catch {
            self.error = "Failed to fetch pending consents: \(error.localizedDescription)"
        }
    }

    // MARK: - Session Timer
    private func startSessionTimer() {
        timer?.invalidate()
        sessionDuration = 0

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.sessionDuration += 1
            }
        }
    }

    private func stopSessionTimer() {
        timer?.invalidate()
        timer = nil
        sessionDuration = 0
    }

    // MARK: - Cleanup
    deinit {
        timer?.invalidate()
    }
}
