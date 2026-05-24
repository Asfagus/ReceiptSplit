import SwiftUI

@main
struct ReceiptSplitApp: App {
    @StateObject private var store = ReceiptStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
