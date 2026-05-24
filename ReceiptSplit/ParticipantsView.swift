import SwiftUI

struct ParticipantsView: View {
    @EnvironmentObject private var store: ReceiptStore
    @State private var name = ""

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("Name", text: $name)
                        .textInputAutocapitalization(.words)

                    Button {
                        store.addParticipant(named: name)
                        name = ""
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }

            Section {
                ForEach(store.participants) { participant in
                    Label(participant.name, systemImage: "person")
                }
                .onDelete(perform: store.removeParticipants)
            }
        }
        .navigationTitle("Participants")
    }
}
