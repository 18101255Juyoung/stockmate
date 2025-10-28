export default function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold mb-4">StockMate</h3>
            <p className="text-sm text-gray-600">
              A social platform for practicing stock investment safely through mock trading and
              community engagement.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="text-gray-600 hover:text-blue-600">
                  About
                </a>
              </li>
              <li>
                <a href="/help" className="text-gray-600 hover:text-blue-600">
                  Help
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-600 hover:text-blue-600">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-600 hover:text-blue-600">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Email: support@stockmate.com</li>
              <li>GitHub: github.com/stockmate</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} StockMate. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
