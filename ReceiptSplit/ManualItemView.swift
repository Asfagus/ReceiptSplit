import SwiftUI

struct ManualItemView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: ReceiptStore
    @State private var name = ""
    @State private var priceText = ""

    var body: some View {
        Form {
            TextField("Item name", text: $name)
            TextField("Price", text: $priceText)
                .keyboardType(.decimalPad)

            Button("Add Item") {
                store.addManualItem(name: name, price: price)
                dismiss()
            }
            .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || price <= 0)
        }
        .navigationTitle("Add Item")
    }

    private var price: Decimal {
        Decimal(string: priceText.replacingOccurrences(of: ",", with: ".")) ?? 0
    }
}
