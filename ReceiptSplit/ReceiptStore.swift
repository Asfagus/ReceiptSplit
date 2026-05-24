import Combine
import Foundation

@MainActor
final class ReceiptStore: ObservableObject {
    @Published var participants: [Participant] = []
    @Published var items: [ReceiptItem] = []
    @Published var sessions: [ReceiptSession] = []

    private var memory: [String: AssignmentMemory] = [:]
    private let storage = AppStorageService()

    init() {
        load()
        if participants.isEmpty {
            participants = [
                Participant(name: "Me"),
                Participant(name: "Friend")
            ]
        }
    }

    var splitShares: [SplitShare] {
        participants.map { participant in
            let total = items.reduce(Decimal.zero) { running, item in
                guard item.assignedParticipantIDs.contains(participant.id) else {
                    return running
                }

                let splitCount = max(item.assignedParticipantIDs.count, 1)
                return running + item.price / Decimal(splitCount)
            }

            return SplitShare(participant: participant, total: total)
        }
        .filter { $0.total > 0 }
        .sorted { $0.participant.name.localizedCaseInsensitiveCompare($1.participant.name) == .orderedAscending }
    }

    func addParticipant(named rawName: String) {
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        guard !participants.contains(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else { return }
        participants.append(Participant(name: name))
        save()
    }

    func removeParticipants(at offsets: IndexSet) {
        let ids = offsets.map { participants[$0].id }
        for offset in offsets.sorted(by: >) {
            participants.remove(at: offset)
        }
        items = items.map { item in
            var copy = item
            copy.assignedParticipantIDs.subtract(ids)
            return copy
        }
        save()
    }

    func replaceItems(with parsedItems: [ReceiptItem]) {
        items = parsedItems.map { item in
            var copy = item
            copy.assignedParticipantIDs = suggestedParticipants(for: item.name)
            if copy.assignedParticipantIDs.isEmpty, let first = participants.first {
                copy.assignedParticipantIDs = [first.id]
            }
            return copy
        }
        save()
    }

    func addManualItem(name: String, price: Decimal) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, price > 0 else { return }
        let assigned = suggestedParticipants(for: trimmed)
        items.append(ReceiptItem(name: trimmed, price: price, assignedParticipantIDs: assigned))
        save()
    }

    func setAssignment(item: ReceiptItem, participant: Participant, isAssigned: Bool) {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        if isAssigned {
            items[index].assignedParticipantIDs.insert(participant.id)
        } else {
            items[index].assignedParticipantIDs.remove(participant.id)
        }
        save()
    }

    func rememberCurrentSplit() {
        for item in items where !item.assignedParticipantIDs.isEmpty {
            let key = Self.normalizedKey(for: item.name)
            let existing = memory[key]
            memory[key] = AssignmentMemory(
                itemKey: key,
                participantIDs: item.assignedParticipantIDs,
                uses: (existing?.uses ?? 0) + 1
            )
        }
        sessions.insert(ReceiptSession(items: items), at: 0)
        save()
    }

    private func suggestedParticipants(for itemName: String) -> Set<UUID> {
        memory[Self.normalizedKey(for: itemName)]?.participantIDs ?? []
    }

    private static func normalizedKey(for itemName: String) -> String {
        itemName
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    private func load() {
        let snapshot = storage.load()
        participants = snapshot.participants
        items = snapshot.items
        sessions = snapshot.sessions
        memory = Dictionary(uniqueKeysWithValues: snapshot.memory.map { ($0.itemKey, $0) })
    }

    private func save() {
        storage.save(
            AppSnapshot(
                participants: participants,
                items: items,
                sessions: sessions,
                memory: Array(memory.values)
            )
        )
    }
}
