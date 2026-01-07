import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import NursePatientDetailsModal from '../NursePatientDetailsModal';

// Mock EVERYTHING to isolate
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-icons/io5', () => ({ IoClose: () => <div />, IoTimeSharp: () => <div />, IoMedical: () => <div />, IoCheckmarkCircle: () => <div />, IoDocumentText: () => <div />, IoAnalytics: () => <div />, IoDocument: () => <div />, IoHeart: () => <div />, IoCheckmark: () => <div />, IoAlertCircle: () => <div />, IoCalendar: () => <div />, IoServer: () => <div />, IoConstruct: () => <div />, IoBusiness: () => <div />, IoPeople: () => <div />, IoCheckmarkDone: () => <div />, IoClipboard: () => <div /> }));
vi.mock('react-icons/fa', () => ({ FaNotesMedical: () => <div />, FaUserMd: () => <div />, FaUserNurse: () => <div />, FaFileMedical: () => <div />, FaFlask: () => <div />, FaPills: () => <div />, FaStethoscope: () => <div /> }));
vi.mock('react-icons/bs', () => ({ BsClockHistory: () => <div /> }));
vi.mock('lucide-react', () => ({ Eye: () => <div />, Download: () => <div />, Trash: () => <div />, Edit: () => <div />, Plus: () => <div />, Upload: () => <div /> }));
vi.mock('recharts', () => ({ ResponsiveContainer: ({ children }) => <div>{children}</div>, LineChart: () => <div />, Line: () => <div />, XAxis: () => <div />, YAxis: () => <div />, CartesianGrid: () => <div />, Dot: () => <div />, LabelList: () => <div /> }));

vi.mock('../utils/useEscapeKey', () => ({ useEscapeKey: () => [false, vi.fn()] }));
vi.mock('../utils/psaVelocity', () => ({ calculatePSAVelocity: vi.fn() }));
vi.mock('../utils/patientPipeline', () => ({ getPatientPipelineStage: vi.fn() }));
vi.mock('../utils/consentFormUtils', () => ({ getConsentFormBlobUrl: vi.fn() }));
vi.mock('../utils/consentFormHelpers', () => ({ getConsentFormTemplate: vi.fn(), getPatientConsentForm: vi.fn(), getPrintButtonTitle: vi.fn() }));
vi.mock('../utils/investigationRequestHelpers', () => ({ createRequestFromMatchOrTest: vi.fn(), createRequestFromClinicalInvestigation: vi.fn(), prepareEditResultData: vi.fn() }));

vi.mock('../services/notesService', () => ({ notesService: { getPatientNotes: vi.fn().mockResolvedValue({ success: true, data: [] }) } }));
vi.mock('../services/investigationService', () => ({ investigationService: { getInvestigationResults: vi.fn().mockResolvedValue({ success: true, data: [] }), getInvestigationRequests: vi.fn().mockResolvedValue({ success: true, data: [] }) } }));
vi.mock('../services/bookingService', () => ({ bookingService: { getPatientAppointments: vi.fn().mockResolvedValue({ success: true, data: [] }) } }));
vi.mock('../services/patientService', () => ({ patientService: { getPatientMDTMeetings: vi.fn().mockResolvedValue({ success: true, data: [] }), getDischargeSummary: vi.fn().mockResolvedValue({ success: true, data: {} }) } }));
vi.mock('../services/consentFormService', () => ({ consentFormService: { getConsentFormTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }), getPatientConsentForms: vi.fn().mockResolvedValue({ success: true, data: [] }) } }));

// Mock all internal modals
const MockModal = ({ isOpen, children }) => isOpen ? <div>{children}</div> : null;
vi.mock('./SuccessModal', () => ({ default: MockModal }));
vi.mock('./modals/ErrorModal', () => ({ default: MockModal }));
vi.mock('./modals/ConfirmationModal', () => ({ default: MockModal }));
vi.mock('./modals/AddPSAResultModal', () => ({ default: MockModal }));
vi.mock('./modals/EditPSAResultModal', () => ({ default: MockModal }));
vi.mock('./modals/BulkPSAUploadModal', () => ({ default: MockModal }));
vi.mock('./AddInvestigationResultModal', () => ({ default: MockModal }));
vi.mock('./MDTSchedulingModal', () => ({ default: MockModal }));
vi.mock('./AddClinicalInvestigationModal', () => ({ default: MockModal }));
vi.mock('./ImageViewerModal', () => ({ default: MockModal }));
vi.mock('./FullScreenPDFModal', () => ({ default: MockModal }));
vi.mock('./EditSurgeryAppointmentModal', () => ({ default: MockModal }));
vi.mock('./EditPatientModal', () => ({ default: MockModal }));
vi.mock('./ConfirmModal', () => ({ default: MockModal }));
vi.mock('./shared/InvestigationRequestItem', () => ({ default: () => <div /> }));
vi.mock('./shared/UploadResultButton', () => ({ default: () => <button /> }));

describe('NursePatientDetailsModal Minimal', () => {
    it('should render basic patient info', async () => {
        const patient = { id: 1, name: 'John Doe', upi: 'UPI123' };
        render(<NursePatientDetailsModal isOpen={true} onClose={vi.fn()} patient={patient} onPatientUpdated={vi.fn()} />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
});
