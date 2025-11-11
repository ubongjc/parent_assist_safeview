import Foundation

// MARK: - User
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let role: UserRole
    let createdAt: Date
    let updatedAt: Date
}

enum UserRole: String, Codable {
    case helper = "HELPER"
    case elder = "ELDER"
    case admin = "ADMIN"
}

// MARK: - Room
struct Room: Codable, Identifiable {
    let id: String
    let inviterId: String
    let inviteeId: String
    let status: RoomStatus
    let expiresAt: Date
    let startedAt: Date?
    let endedAt: Date?
    let metadata: RoomMetadata?
    let createdAt: Date
    let updatedAt: Date

    var inviter: UserInfo?
    var invitee: UserInfo?
    var consents: [Consent]?
}

struct UserInfo: Codable {
    let id: String
    let name: String?
    let email: String
}

struct RoomMetadata: Codable {
    let durationMinutes: Int?
    let requestMessage: String?
    let endReason: String?
    let endedBy: String?
    let endedByRole: String?
}

enum RoomStatus: String, Codable {
    case pending = "PENDING"
    case active = "ACTIVE"
    case ended = "ENDED"
    case expired = "EXPIRED"
}

// MARK: - Consent
struct Consent: Codable, Identifiable {
    let id: String
    let roomId: String
    let giverId: String
    let requesterId: String
    let status: ConsentStatus
    let message: String?
    let grantedAt: Date?
    let revokedAt: Date?
    let expiresAt: Date
    let createdAt: Date
    let updatedAt: Date
}

enum ConsentStatus: String, Codable {
    case requested = "REQUESTED"
    case granted = "GRANTED"
    case denied = "DENIED"
    case revoked = "REVOKED"
}

// MARK: - API Responses
struct CreateRoomResponse: Codable {
    let room: Room
    let consent: Consent
    let message: String
}

struct JoinRoomResponse: Codable {
    let room: Room
    let consent: Consent?
    let message: String
}

struct EndRoomResponse: Codable {
    let room: Room
    let consent: Consent?
    let message: String
    let endedBy: String
}

struct RoomsListResponse: Codable {
    let rooms: [Room]
}

struct HealthResponse: Codable {
    let status: String
    let timestamp: String
    struct Services: Codable {
        let database: String
        let api: String
    }
    let services: Services
}

// MARK: - API Requests
struct CreateRoomRequest: Codable {
    let inviteeId: String
    let durationMinutes: Int
    let message: String?
}

struct JoinRoomRequest: Codable {
    let roomId: String
    let consentGranted: Bool
}

struct EndRoomRequest: Codable {
    let roomId: String
    let reason: String?
}
