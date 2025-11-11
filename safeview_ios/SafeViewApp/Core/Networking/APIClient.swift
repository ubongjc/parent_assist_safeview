import Foundation

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case notFound
    case serverError(String)
    case decodingError(Error)
    case networkError(Error)
}

class APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession

    private init() {
        // In production, load from Configuration
        self.baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000"

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }

    // MARK: - Generic Request Method
    func request<T: Codable>(
        endpoint: String,
        method: String = "GET",
        body: Codable? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        guard var urlComponents = URLComponents(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        if let queryItems = queryItems {
            urlComponents.queryItems = queryItems
        }

        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add authentication token if available
        if let token = AuthenticationManager.shared.authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            switch httpResponse.statusCode {
            case 200...299:
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
            case 401:
                throw APIError.unauthorized
            case 404:
                throw APIError.notFound
            case 400...499, 500...599:
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw APIError.serverError(errorMessage)
            default:
                throw APIError.invalidResponse
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Health Check
    func checkHealth() async throws -> HealthResponse {
        return try await request(endpoint: "/api/health")
    }

    // MARK: - Room Endpoints
    func createRoom(inviteeId: String, durationMinutes: Int, message: String?) async throws -> CreateRoomResponse {
        let request = CreateRoomRequest(
            inviteeId: inviteeId,
            durationMinutes: durationMinutes,
            message: message
        )
        return try await self.request(
            endpoint: "/api/room",
            method: "POST",
            body: request
        )
    }

    func listRooms(status: RoomStatus? = nil, limit: Int = 20) async throws -> RoomsListResponse {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "limit", value: "\(limit)")
        ]

        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
        }

        return try await request(
            endpoint: "/api/room",
            queryItems: queryItems
        )
    }

    func joinRoom(roomId: String, consentGranted: Bool) async throws -> JoinRoomResponse {
        let request = JoinRoomRequest(
            roomId: roomId,
            consentGranted: consentGranted
        )
        return try await self.request(
            endpoint: "/api/room/join",
            method: "POST",
            body: request
        )
    }

    func endRoom(roomId: String, reason: String?) async throws -> EndRoomResponse {
        let request = EndRoomRequest(
            roomId: roomId,
            reason: reason
        )
        return try await self.request(
            endpoint: "/api/room/end",
            method: "POST",
            body: request
        )
    }
}
