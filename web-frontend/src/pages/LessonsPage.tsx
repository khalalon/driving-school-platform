import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function LessonsPage() {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => api.getLessons(),
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading lessons...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Available Lessons</h1>
        <p className="mt-2 text-gray-600">Book driving lessons with certified instructors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {lessons?.map((lesson: any) => (
          <div key={lesson.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">{lesson.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{lesson.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span className="mr-4">⏱️ {lesson.duration} min</span>
                  <span>💰 ${lesson.price}</span>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
