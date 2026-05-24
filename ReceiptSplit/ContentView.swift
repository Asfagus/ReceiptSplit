import PhotosUI
import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var store: ReceiptStore
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var isScanning = false
    @State private var scanError: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Label("Upload Receipt", systemImage: "doc.viewfinder")
                    }

                    NavigationLink {
                        ParticipantsView()
                    } label: {
                        Label("Participants", systemImage: "person.2")
                    }
                }

                if isScanning {
                    Section {
                        HStack {
                            ProgressView()
                            Text("Reading receipt")
                        }
                    }
                }

                if let scanError {
                    Section {
                        Text(scanError)
                            .foregroundStyle(.red)
                    }
                }

                Section("Items") {
                    if store.items.isEmpty {
                        ContentUnavailableView(
                            "No receipt yet",
                            systemImage: "receipt",
                            description: Text("Upload a photo or add items by hand.")
                        )
                    } else {
                        ForEach(store.items) { item in
                            NavigationLink {
                                ItemAssignmentView(item: item)
                            } label: {
                                ReceiptItemRow(item: item)
                            }
                        }
                    }

                    NavigationLink {
                        ManualItemView()
                    } label: {
                        Label("Add Item", systemImage: "plus")
                    }
                }

                Section("Split") {
                    if store.splitShares.isEmpty {
                        Text("Assign items to participants to see totals.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(store.splitShares) { share in
                            HStack {
                                Text(share.participant.name)
                                Spacer()
                                Text(share.total.currencyText)
                                    .fontWeight(.semibold)
                            }
                        }

                        Button {
                            store.rememberCurrentSplit()
                        } label: {
                            Label("Save Split to History", systemImage: "clock.arrow.circlepath")
                        }
                    }
                }
            }
            .navigationTitle("Receipt Split")
            .task(id: selectedPhoto) {
                await scanSelectedPhoto()
            }
        }
    }

    private func scanSelectedPhoto() async {
        guard let selectedPhoto else { return }
        isScanning = true
        scanError = nil
        defer { isScanning = false }

        do {
            guard let data = try await selectedPhoto.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                scanError = "Could not load that image."
                return
            }

            let text = try await ReceiptOCRService().recognizeText(from: image)
            let items = ReceiptParser().parseItems(from: text)
            if items.isEmpty {
                scanError = "I read the image, but could not find priced line items. Try a clearer receipt or add items manually."
            }
            store.replaceItems(with: items)
        } catch {
            scanError = error.localizedDescription
        }
    }
}

private struct ReceiptItemRow: View {
    @EnvironmentObject private var store: ReceiptStore
    var item: ReceiptItem

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(item.name)
                Spacer()
                Text(item.price.currencyText)
                    .fontWeight(.semibold)
            }

            Text(assignedNames)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var assignedNames: String {
        let names = store.participants
            .filter { item.assignedParticipantIDs.contains($0.id) }
            .map(\.name)
        return names.isEmpty ? "Unassigned" : names.joined(separator: ", ")
    }
}
