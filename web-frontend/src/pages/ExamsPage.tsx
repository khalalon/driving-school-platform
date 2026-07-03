import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function ExamsPage() {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.getExams(),
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading exams...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upcoming Exams</h1>
        <p className="mt-2 text-gray-600">Register for your driving license exam</p>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {exams?.map((exam: any) => (
            <li key={exam.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600 truncate">{exam.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="mr-4">📅 {new Date(exam.date).toLocaleDateString()}</span>
                      <span>⏰ {exam.duration} minutes</span>
                    </p>
                  </div>
                  <div className="ml-4">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
