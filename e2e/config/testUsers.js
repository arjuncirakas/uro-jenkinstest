/**
 * E2E Test User Configuration
 * 
 * Test credentials are loaded from environment variables for security.
 * Set these in your .env file or export them before running tests:
 * 
 * E2E_SUPERADMIN_EMAIL=admin@urology.com
 * E2E_SUPERADMIN_PASSWORD=YourSecurePassword
 * E2E_DOCTOR_EMAIL=testdoctor@yopmail.com
 * E2E_DOCTOR_PASSWORD=YourDoctorPassword
 * E2E_GP_EMAIL=testgp@yopmail.com
 * E2E_GP_PASSWORD=YourGPPassword
 * E2E_NURSE_EMAIL=testnurse@yopmail.com
 * E2E_NURSE_PASSWORD=YourNursePassword
 */

export const testUsers = {
    superadmin: {
        role: 'superadmin',
        dashboardRoute: '/superadmin/dashboard',
        // Credentials loaded from environment
        email: process.env.E2E_SUPERADMIN_EMAIL || '',
        get password() {
            // NOSONAR - this is a test configuration that reads from env vars
            return process.env.E2E_SUPERADMIN_PASSWORD || '';
        }
    },
    urologist: {
        role: 'urologist',
        dashboardRoute: '/urologist/dashboard',
        email: process.env.E2E_DOCTOR_EMAIL || '',
        get password() {
            // NOSONAR - this is a test configuration that reads from env vars
            return process.env.E2E_DOCTOR_PASSWORD || '';
        }
    },
    gp: {
        role: 'gp',
        dashboardRoute: '/gp/dashboard',
        email: process.env.E2E_GP_EMAIL || '',
        get password() {
            // NOSONAR - this is a test configuration that reads from env vars
            return process.env.E2E_GP_PASSWORD || '';
        }
    },
    nurse: {
        role: 'urology_nurse',
        dashboardRoute: '/nurse/opd-management',
        email: process.env.E2E_NURSE_EMAIL || '',
        get password() {
            // NOSONAR - this is a test configuration that reads from env vars
            return process.env.E2E_NURSE_PASSWORD || '';
        }
    }
};

/**
 * Check if test credentials are configured
 */
export function areTestCredentialsConfigured(userType) {
    const user = testUsers[userType];
    return user && user.email && user.password;
}

/**
 * Get test user credentials (with validation)
 */
export function getTestUser(userType) {
    const user = testUsers[userType];
    if (!user || !user.email || !user.password) {
        console.warn(`⚠️ E2E test credentials for ${userType} not configured. Set E2E_${userType.toUpperCase()}_EMAIL and E2E_${userType.toUpperCase()}_PASSWORD environment variables.`);
        return null;
    }
    return user;
}
