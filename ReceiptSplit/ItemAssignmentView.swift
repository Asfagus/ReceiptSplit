import SwiftUI

struct ItemAssignmentView: View {
    @EnvironmentObject private var store: ReceiptStore
    var item: ReceiptItem

    private var currentItem: ReceiptItem {
        store.items.first(where: { $0.id == item.id }) ?? item
    }

    var body: some View {
        List {
            Section {
                HStack {
                    Text(currentItem.name)
                    Spacer()
                    Text(currentItem.price.currencyText)
                        .fontWeight(.semibold)
                }
            }

            Section("Assigned To") {
                ForEach(store.participants) { participant in
                    Toggle(participant.name, isOn: binding(for: participant))
                }
            }
        }
        .navigationTitle("Split Item")
    }

    private func binding(for participant: Participant) -> Binding<Bool> {
        Binding(
            get: {
                currentItem.assignedParticipantIDs.contains(participant.id)
            },
            set: { isAssigned in
                store.setAssignment(item: currentItem, participant: participant, isAssigned: isAssigned)
            }
        )
    }
}
