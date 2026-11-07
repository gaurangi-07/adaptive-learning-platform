/**
 * @file mockStudentBaselineAdapter.js
 * @description Mock adapter simulating Module 1's Student Baseline API.
 * 
 * IMPORTANT: This adapter is strictly for development and testing.
 * In production, this adapter is disabled (controlled by ENABLE_MOCK_STUDENT environment variable)
 * and replaced by the real Module 1 service or database query.
 */

const { validateStudentBaseline } = require('../contracts/baselineContract');

/**
 * Pre-configured mock student baseline datasets for testing different scenarios.
 */
const MOCK_STUDENT_BASELINES = {
  12: {
    studentId: 12,
    subject: "Mathematics",
    baselineLevel: 2,
    topicScores: {
      algebra: 70,
      geometry: 40,
      arithmetic: 80,
      trigonometry: 35,
      statistics: 65
    },
    metadata: {
      studentName: "Aarav Sharma",
      classGrade: "Grade 10",
      assessedAt: "2026-11-01T10:00:00.000Z"
    }
  },
  25: {
    studentId: 25,
    subject: "Mathematics",
    baselineLevel: 1,
    topicScores: {
      algebra: 30,
      geometry: 35,
      arithmetic: 45
    },
    metadata: {
      studentName: "Diya Patel",
      classGrade: "Grade 10",
      assessedAt: "2026-11-02T11:30:00.000Z"
    }
  },
  42: {
    studentId: 42,
    subject: "Mathematics",
    baselineLevel: 3,
    topicScores: {
      algebra: 90,
      geometry: 85,
      arithmetic: 95
    },
    metadata: {
      studentName: "Rohan Verma",
      classGrade: "Grade 10",
      assessedAt: "2026-11-03T09:15:00.000Z"
    }
  }
};

class MockStudentBaselineAdapter {
  /**
   * Check if mock adapter is permitted in current environment.
   */
  static isEnabled() {
    const isExplicitlyEnabled = process.env.ENABLE_MOCK_STUDENT === 'true';
    const isDevelopment = (process.env.NODE_ENV || 'development') !== 'production';
    return isExplicitlyEnabled || isDevelopment;
  }

  /**
   * Retrieves baseline profile for a given student.
   * @param {number} studentId
   * @returns {Promise<object>}
   */
  static async getStudentBaseline(studentId = 12) {
    if (!this.isEnabled()) {
      throw new Error(
        "MockStudentBaselineAdapter is disabled in production. Module 1 real service integration required."
      );
    }

    const baseline = MOCK_STUDENT_BASELINES[studentId] || {
      studentId: Number(studentId),
      subject: "Mathematics",
      baselineLevel: 2,
      topicScores: {
        algebra: 50,
        geometry: 50,
        arithmetic: 50
      },
      metadata: {
        studentName: `Student #${studentId}`,
        classGrade: "Grade 10",
        assessedAt: new Date().toISOString()
      }
    };

    const validation = validateStudentBaseline(baseline);
    if (!validation.valid) {
      throw new Error(`Mock baseline invalid: ${validation.errors.message}`);
    }

    return validation.data;
  }

  /**
   * Lists all available mock student baseline profiles.
   */
  static getAvailableMockStudents() {
    return Object.values(MOCK_STUDENT_BASELINES);
  }
}

module.exports = {
  MockStudentBaselineAdapter,
  MOCK_STUDENT_BASELINES
};
