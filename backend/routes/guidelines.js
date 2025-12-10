import express from 'express';
import {
  getPatientGuidelines,
  getPatientRecommendations,
  validatePathway,
  checkPathwayComplianceEndpoint,
  checkInvestigationComplianceEndpoint,
  getGuidelinesByCategoryEndpoint
} from '../controllers/guidelineController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get applicable guidelines for a patient
router.get('/patient/:patientId', getPatientGuidelines);

// Get decision support recommendations for a patient
router.get('/recommendations/:patientId', getPatientRecommendations);

// Validate pathway transition
router.post('/validate-pathway', validatePathway);

// Check pathway compliance
router.post('/check-pathway-compliance', checkPathwayComplianceEndpoint);

// Check investigation compliance
router.post('/check-investigation-compliance', checkInvestigationComplianceEndpoint);

// Get guidelines by category
router.get('/category/:category', getGuidelinesByCategoryEndpoint);

export default router;

