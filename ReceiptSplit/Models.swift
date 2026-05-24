import Foundation

struct Participant: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
}

struct ReceiptItem: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    var price: Decimal
    var assignedParticipantIDs: Set<UUID> = []
}

struct SplitShare: Identifiable, Hashable {
    var id: UUID { participant.id }
    var participant: Participant
    var total: Decimal
}

struct AssignmentMemory: Codable {
    var itemKey: String
    var participantIDs: Set<UUID>
    var uses: Int
}

struct ReceiptSession: Codable {
    var id = UUID()
    var date = Date()
    var items: [ReceiptItem]
}

extension Decimal {
    var currencyText: String {
        let number = NSDecimalNumber(decimal: self)
        return CurrencyFormatter.shared.string(from: number) ?? "$0.00"
    }
}

enum CurrencyFormatter {
    static let shared: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 2
        return formatter
    }()
}
