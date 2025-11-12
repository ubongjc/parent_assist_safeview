import Foundation
import Security

/// Secure Keychain storage for sensitive data like auth tokens
/// Uses iOS Keychain instead of UserDefaults for proper encryption
class KeychainHelper {
    static let shared = KeychainHelper()

    private init() {}

    // MARK: - Public Methods

    /// Save a string value to Keychain
    /// - Parameters:
    ///   - value: The string to store
    ///   - key: The key to identify the value
    ///   - Returns: True if successful, false otherwise
    @discardableResult
    func save(_ value: String, forKey key: String) -> Bool {
        guard let data = value.data(using: .utf8) else {
            return false
        }

        return save(data, forKey: key)
    }

    /// Save data to Keychain
    /// - Parameters:
    ///   - data: The data to store
    ///   - key: The key to identify the data
    ///   - Returns: True if successful, false otherwise
    @discardableResult
    func save(_ data: Data, forKey key: String) -> Bool {
        // First, delete any existing value
        delete(forKey: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    /// Retrieve a string value from Keychain
    /// - Parameter key: The key to look up
    /// - Returns: The string value if found, nil otherwise
    func getString(forKey key: String) -> String? {
        guard let data = getData(forKey: key) else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    /// Retrieve data from Keychain
    /// - Parameter key: The key to look up
    /// - Returns: The data if found, nil otherwise
    func getData(forKey key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            return nil
        }

        return result as? Data
    }

    /// Delete a value from Keychain
    /// - Parameter key: The key to delete
    /// - Returns: True if successful (or if the key didn't exist), false otherwise
    @discardableResult
    func delete(forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        // Success if deleted or if the item didn't exist
        return status == errSecSuccess || status == errSecItemNotFound
    }

    /// Delete all values from Keychain (use with caution!)
    /// - Returns: True if successful, false otherwise
    @discardableResult
    func deleteAll() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}

// MARK: - Keychain Keys
extension KeychainHelper {
    /// Predefined keys for common secure storage needs
    enum Keys {
        static let authToken = "com.safeview.authToken"
        static let userId = "com.safeview.userId"
        static let refreshToken = "com.safeview.refreshToken"
    }
}
