export default function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} StockMate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
