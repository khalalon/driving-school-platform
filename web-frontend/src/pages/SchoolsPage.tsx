import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function SchoolsPage() {
  const { data: schools, isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.getSchools(),
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading schools...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Driving Schools</h1>
        <p className="mt-2 text-gray-600">Browse and enroll at available schools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools?.map((school: any) => (
          <div key={school.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">{school.name}</h3>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="mr-2">📍</span>
                  {school.address}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="mr-2">📞</span>
                  {school.phone}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="mr-2">✉️</span>
                  {school.email}
                </p>
              </div>
              <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Request Enrollment
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
