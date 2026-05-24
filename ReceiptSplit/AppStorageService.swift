import Foundation

struct AppSnapshot: Codable {
    var participants: [Participant] = []
    var items: [ReceiptItem] = []
    var sessions: [ReceiptSession] = []
    var memory: [AssignmentMemory] = []
}

struct AppStorageService {
    private let key = "receipt-split-snapshot"

    func load() -> AppSnapshot {
        guard let data = UserDefaults.standard.data(forKey: key) else {
            return AppSnapshot()
        }

        do {
            return try JSONDecoder().decode(AppSnapshot.self, from: data)
        } catch {
            return AppSnapshot()
        }
    }

    func save(_ snapshot: AppSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
