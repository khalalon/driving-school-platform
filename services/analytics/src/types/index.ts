export interface RevenueReport {
  schoolId?: string;
  instructorId?: string;
  totalRevenue: number;
  lessonRevenue: number;
  examRevenue: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface LessonStats {
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  averageAttendance: number;
  popularLessonType: string;
  popularTimeSlot: string;
}

export interface ExamStats {
  totalExams: number;
  passRate: number;
  failRate: number;
  averageScore: number;
  typeBreakdown: {
    theory: { passed: number; failed: number };
    practical: { passed: number; failed: number };
  };
}

export interface StudentEngagement {
  studentId: string;
  totalBookings: number;
  attendanceRate: number;
  lastBookingDate: Date;
  favoriteInstructor?: string;
}

export interface InstructorPerformance {
  instructorId: string;
  name: string;
  totalLessons: number;
  completedLessons: number;
  averageRating: number;
  revenue: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsQuery extends DateRange {
  schoolId?: string;
  instructorId?: string;
  studentId?: string;
}
