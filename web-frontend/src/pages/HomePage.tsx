/**
 * Simple Home Page for Testing
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            🚗 Driving School Platform
          </h1>
          <p className="mt-6 text-xl text-gray-600">
            Your complete driving school management system
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow">
            <div className="p-8">
              <div className="text-4xl mb-4">👨‍🎓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">For Students</h3>
              <p className="text-gray-600 mb-4">
                Browse schools, book lessons, and register for exams
              </p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Get Started →
              </a>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow">
            <div className="p-8">
              <div className="text-4xl mb-4">👨‍🏫</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">For Instructors</h3>
              <p className="text-gray-600 mb-4">
                Manage lessons, track students, and schedule exams
              </p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Get Started →
              </a>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-xl transition-shadow">
            <div className="p-8">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">For Schools</h3>
              <p className="text-gray-600 mb-4">
                Manage your driving school business efficiently
              </p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                Get Started →
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white shadow rounded-lg">
          <div className="px-4 py-8 sm:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">8 Microservices Running</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Database Connected</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">API Gateway Active</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Web Frontend Ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">🚀 Quick Test</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click "Get Started" above</li>
            <li>Register a new account (use any email & password)</li>
            <li>Login with your credentials</li>
            <li>Explore schools, lessons, and exams</li>
            <li>Everything is connected to the real backend!</li>
          </ol>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Built with React + TypeScript + Vite + Tailwind CSS</p>
          <p className="mt-2">Backend: Node.js + PostgreSQL + Redis + Docker</p>
        </div>
      </div>
    </div>
  );
}
