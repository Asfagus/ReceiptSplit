import Foundation

struct ReceiptParser {
    func parseItems(from text: String) -> [ReceiptItem] {
        text
            .components(separatedBy: .newlines)
            .compactMap(parseLine)
            .filter { item in
                let key = item.name.lowercased()
                return !key.contains("subtotal")
                    && !key.contains("total")
                    && !key.contains("tax")
                    && !key.contains("tip")
            }
    }

    private func parseLine(_ line: String) -> ReceiptItem? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 4 else { return nil }

        let pattern = #"^(.*?)[\s$]+([0-9]+[.,][0-9]{2})$"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(trimmed.startIndex..<trimmed.endIndex, in: trimmed)
        guard let match = regex.firstMatch(in: trimmed, range: range),
              match.numberOfRanges == 3,
              let nameRange = Range(match.range(at: 1), in: trimmed),
              let priceRange = Range(match.range(at: 2), in: trimmed) else {
            return nil
        }

        let name = String(trimmed[nameRange])
            .trimmingCharacters(in: CharacterSet(charactersIn: " -.\t"))
        let priceText = String(trimmed[priceRange]).replacingOccurrences(of: ",", with: ".")

        guard !name.isEmpty, let price = Decimal(string: priceText), price > 0 else {
            return nil
        }

        return ReceiptItem(name: name, price: price)
    }
}
