import pool from '../config/database.js';

/**
 * Get average wait time from referral to first consult
 */
export const getAverageWaitTime = async (req, res) => {
  const client = await pool.connect();
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE p.referral_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        AVG((first_consult_date - p.referral_date)) as avg_wait_days,
        COUNT(*) as total_patients,
        MIN((first_consult_date - p.referral_date)) as min_wait_days,
        MAX((first_consult_date - p.referral_date)) as max_wait_days,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (first_consult_date - p.referral_date)) as median_wait_days
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT MIN(appointment_date) as first_consult_date
        FROM appointments
        WHERE patient_id = p.id
        AND status IN ('completed', 'confirmed', 'scheduled')
        AND appointment_type = 'urologist'
      ) first_consult ON true
      ${dateFilter || 'WHERE 1=1'}
      AND first_consult.first_consult_date IS NOT NULL
    `;
    
    const result = await client.query(query, params);
    
    res.json({
      success: true,
      data: {
        averageWaitDays: parseFloat(result.rows[0]?.avg_wait_days || 0).toFixed(1),
        totalPatients: parseInt(result.rows[0]?.total_patients || 0),
        minWaitDays: parseFloat(result.rows[0]?.min_wait_days || 0).toFixed(1),
        maxWaitDays: parseFloat(result.rows[0]?.max_wait_days || 0).toFixed(1),
        medianWaitDays: parseFloat(result.rows[0]?.median_wait_days || 0).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Get average wait time error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get compliance rate for active surveillance follow-ups
 */
export const getActiveSurveillanceCompliance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND p.care_pathway_updated_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_active_surveillance,
        COUNT(CASE 
          WHEN last_psa_date IS NOT NULL 
          AND last_psa_date >= (CURRENT_DATE - INTERVAL '6 months')
          THEN 1 
        END) as compliant_patients,
        COUNT(CASE 
          WHEN last_psa_date IS NULL 
          OR last_psa_date < (CURRENT_DATE - INTERVAL '6 months')
          THEN 1 
        END) as non_compliant_patients
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT MAX(test_date) as last_psa_date
        FROM investigation_results
        WHERE patient_id = p.id
        AND LOWER(test_type) = 'psa'
      ) last_psa ON true
      WHERE p.care_pathway = 'Active Surveillance'
      AND p.status = 'Active'
      ${dateFilter}
    `;
    
    const result = await client.query(query, params);
    const row = result.rows[0];
    const total = parseInt(row.total_active_surveillance || 0);
    const compliant = parseInt(row.compliant_patients || 0);
    const nonCompliant = parseInt(row.non_compliant_patients || 0);
    const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        totalPatients: total,
        compliantPatients: compliant,
        nonCompliantPatients: nonCompliant,
        complianceRate: parseFloat(complianceRate),
        compliancePercentage: `${complianceRate}%`
      }
    });
  } catch (error) {
    console.error('Get active surveillance compliance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get percentage of patients discharged back to GP
 */
export const getDischargeToGPPercentage = async (req, res) => {
  const client = await pool.connect();
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE p.care_pathway_updated_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_discharged,
        COUNT(CASE WHEN p.referred_by_gp_id IS NOT NULL THEN 1 END) as discharged_to_gp,
        COUNT(CASE WHEN p.referred_by_gp_id IS NULL THEN 1 END) as discharged_without_gp
      FROM patients p
      ${dateFilter || 'WHERE 1=1'}
      AND p.care_pathway = 'Discharge'
      AND p.status = 'Discharged'
    `;
    
    const result = await client.query(query, params);
    const row = result.rows[0];
    const total = parseInt(row.total_discharged || 0);
    const toGP = parseInt(row.discharged_to_gp || 0);
    const withoutGP = parseInt(row.discharged_without_gp || 0);
    const percentage = total > 0 ? ((toGP / total) * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        totalDischarged: total,
        dischargedToGP: toGP,
        dischargedWithoutGP: withoutGP,
        percentage: parseFloat(percentage),
        percentageText: `${percentage}%`
      }
    });
  } catch (error) {
    console.error('Get discharge to GP percentage error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get all KPIs in one call
 */
export const getAllKPIs = async (req, res) => {
  const client = await pool.connect();
  try {
    // Make date filter optional - if not provided, show all data
    const { startDate, endDate } = req.query;
    const hasDateFilter = startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '';
    
    // Get all KPIs in parallel
    const [waitTimeResult, complianceResult, dischargeResult] = await Promise.all([
      // Average wait time
      (async () => {
        let dateFilter = '';
        const params = [];
        
        if (hasDateFilter) {
          dateFilter = 'WHERE p.referral_date BETWEEN $1 AND $2';
          params.push(startDate, endDate);
        }
        
        const query = `
          SELECT 
            AVG((first_consult_date - p.referral_date)) as avg_wait_days,
            COUNT(*) as total_patients
          FROM patients p
          LEFT JOIN LATERAL (
            SELECT MIN(appointment_date) as first_consult_date
            FROM appointments
            WHERE patient_id = p.id
            AND status IN ('completed', 'confirmed', 'scheduled')
            AND (appointment_type = 'urologist' OR appointment_type = 'doctor')
          ) first_consult ON true
          ${dateFilter || 'WHERE 1=1'}
          AND first_consult.first_consult_date IS NOT NULL
          AND p.referral_date IS NOT NULL
        `;
        return await client.query(query, params);
      })(),
      
      // Active surveillance compliance
      (async () => {
        let dateFilter = '';
        const params = [];
        
        if (hasDateFilter) {
          dateFilter = 'AND p.care_pathway_updated_at BETWEEN $1 AND $2';
          params.push(startDate, endDate);
        }
        
        const query = `
          SELECT 
            COUNT(*) as total_active_surveillance,
            COUNT(CASE 
              WHEN last_psa_date IS NOT NULL 
              AND last_psa_date >= (CURRENT_DATE - INTERVAL '6 months')
              THEN 1 
            END) as compliant_patients
          FROM patients p
          LEFT JOIN LATERAL (
            SELECT MAX(test_date) as last_psa_date
            FROM investigation_results
            WHERE patient_id = p.id
            AND LOWER(test_type) = 'psa'
          ) last_psa ON true
          WHERE p.care_pathway = 'Active Surveillance'
          AND p.status = 'Active'
          ${dateFilter}
        `;
        return await client.query(query, params);
      })(),
      
      // Discharge to GP percentage
      (async () => {
        let dateFilter = '';
        const params = [];
        
        if (hasDateFilter) {
          dateFilter = 'WHERE p.care_pathway_updated_at BETWEEN $1 AND $2';
          params.push(startDate, endDate);
        }
        
        const query = `
          SELECT 
            COUNT(*) as total_discharged,
            COUNT(CASE WHEN p.referred_by_gp_id IS NOT NULL THEN 1 END) as discharged_to_gp
          FROM patients p
          ${dateFilter || 'WHERE 1=1'}
          AND p.care_pathway = 'Discharge'
          AND p.status = 'Discharged'
        `;
        return await client.query(query, params);
      })()
    ]);
    
    // Calculate wait time metrics
    const waitTimeRow = waitTimeResult.rows[0];
    const avgWaitDays = parseFloat(waitTimeRow?.avg_wait_days || 0);
    const totalPatientsWithConsult = parseInt(waitTimeRow?.total_patients || 0);
    
    // Calculate compliance metrics
    const complianceRow = complianceResult.rows[0];
    const totalActiveSurveillance = parseInt(complianceRow?.total_active_surveillance || 0);
    const compliant = parseInt(complianceRow?.compliant_patients || 0);
    const complianceRate = totalActiveSurveillance > 0 ? ((compliant / totalActiveSurveillance) * 100) : 0;
    
    // Calculate discharge metrics
    const dischargeRow = dischargeResult.rows[0];
    const totalDischarged = parseInt(dischargeRow?.total_discharged || 0);
    const dischargedToGP = parseInt(dischargeRow?.discharged_to_gp || 0);
    const dischargePercentage = totalDischarged > 0 ? ((dischargedToGP / totalDischarged) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        averageWaitTime: {
          days: avgWaitDays.toFixed(1),
          totalPatients: totalPatientsWithConsult
        },
        activeSurveillanceCompliance: {
          rate: complianceRate.toFixed(1),
          percentage: `${complianceRate.toFixed(1)}%`,
          totalPatients: totalActiveSurveillance,
          compliantPatients: compliant,
          nonCompliantPatients: totalActiveSurveillance - compliant
        },
        dischargeToGP: {
          percentage: dischargePercentage.toFixed(1),
          percentageText: `${dischargePercentage.toFixed(1)}%`,
          totalDischarged: totalDischarged,
          dischargedToGP: dischargedToGP,
          dischargedWithoutGP: totalDischarged - dischargedToGP
        }
      }
    });
  } catch (error) {
    console.error('Get all KPIs error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  } finally {
    client.release();
  }
};

/**
 * Get historical trend data for KPIs
 */
export const getKPITrends = async (req, res) => {
  const client = await pool.connect();
  try {
    const { period = 'month', months = 12 } = req.query;
    
    const periodMap = {
      'day': 'day',
      'week': 'week',
      'month': 'month',
      'year': 'year'
    };
    const periodType = periodMap[period] || 'month';
    const monthsInt = parseInt(months) || 12;
    
    // Get wait time trends
    const waitTimeTrendsQuery = `
      SELECT 
        DATE_TRUNC($1, p.referral_date) as period,
        AVG((first_consult_date - p.referral_date)) as avg_wait_days,
        COUNT(*) as patient_count
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT MIN(appointment_date) as first_consult_date
        FROM appointments
        WHERE patient_id = p.id
        AND status IN ('completed', 'confirmed', 'scheduled')
        AND appointment_type = 'urologist'
      ) first_consult ON true
      WHERE p.referral_date >= CURRENT_DATE - INTERVAL '${monthsInt} months'
      AND first_consult.first_consult_date IS NOT NULL
      GROUP BY DATE_TRUNC($1, p.referral_date)
      ORDER BY period ASC
    `;
    
    const waitTimeResult = await client.query(waitTimeTrendsQuery, [periodType]);
    
    // Get compliance trends
    const complianceTrendsQuery = `
      SELECT 
        DATE_TRUNC($1, p.care_pathway_updated_at) as period,
        COUNT(*) as total_patients,
        COUNT(CASE 
          WHEN last_psa_date IS NOT NULL 
          AND last_psa_date >= (p.care_pathway_updated_at + INTERVAL '6 months')
          THEN 1 
        END) as compliant_patients
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT MAX(test_date) as last_psa_date
        FROM investigation_results
        WHERE patient_id = p.id
        AND LOWER(test_type) = 'psa'
      ) last_psa ON true
      WHERE p.care_pathway = 'Active Surveillance'
      AND p.status = 'Active'
      AND p.care_pathway_updated_at >= CURRENT_DATE - INTERVAL '${monthsInt} months'
      GROUP BY DATE_TRUNC($1, p.care_pathway_updated_at)
      ORDER BY period ASC
    `;
    
    const complianceResult = await client.query(complianceTrendsQuery, [periodType]);
    
    res.json({
      success: true,
      data: {
        waitTimeTrends: waitTimeResult.rows.map(row => ({
          period: row.period,
          avgWaitDays: parseFloat(row.avg_wait_days || 0).toFixed(1),
          patientCount: parseInt(row.patient_count || 0)
        })),
        complianceTrends: complianceResult.rows.map(row => {
          const total = parseInt(row.total_patients || 0);
          const compliant = parseInt(row.compliant_patients || 0);
          return {
            period: row.period,
            complianceRate: total > 0 ? ((compliant / total) * 100).toFixed(1) : 0,
            totalPatients: total,
            compliantPatients: compliant
          };
        })
      }
    });
  } catch (error) {
    console.error('Get KPI trends error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

