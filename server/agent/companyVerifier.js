/**
 * companyVerifier.js
 * Cross-checks company registration details against simulated primary registries.
 * Adheres strictly to the verification nuance:
 * "Company registration information found" != "Company is safe / approved".
 */

class CompanyVerifier {
  constructor() {
    // Known test registry database
    this.simulatedRegistry = {
      'nextgen tech education pvt ltd': {
        name: 'NextGen Tech Education Pvt Ltd',
        cin: 'U72900DL2021PTC384920',
        status: 'Active',
        state: 'Delhi, India',
        authority: 'Ministry of Corporate Affairs (MCA)',
        incorporationDate: '2021-04-12',
        officialWebsite: 'https://nextgentech-edu.example.com',
        verified: true,
        source: 'MCA Master Data Portal',
        sourceUrl: 'https://www.mca.gov.in',
        notes: 'Entity is officially registered. However, registration does not endorse commercial contract terms or training fee policies.'
      },
      'cloudscale software solutions': {
        name: 'CloudScale Software Solutions LLP',
        cin: 'AAX-4829',
        status: 'Active',
        state: 'Karnataka, India',
        authority: 'Registrar of Companies (ROC Bangalore)',
        incorporationDate: '2019-11-03',
        officialWebsite: 'https://cloudscale-solutions.example.com',
        verified: true,
        source: 'ROC Public Records',
        sourceUrl: 'https://www.mca.gov.in',
        notes: 'Corporate entity active. Standard verification completed.'
      },
      'acme tech labs inc': {
        name: 'Acme Tech Labs Inc.',
        cin: 'U74999MH2018PTC308472',
        status: 'Active',
        state: 'Maharashtra, India',
        authority: 'MCA Maharashtra',
        incorporationDate: '2018-02-15',
        officialWebsite: 'https://acmelabs.example.com',
        verified: true,
        source: 'MCA Portal',
        sourceUrl: 'https://www.mca.gov.in',
        notes: 'Established registered software development entity.'
      }
    };
  }

  /**
   * Extracts possible company name from document text
   */
  extractCompanyName(text) {
    if (!text) return 'Organization Name';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Look for common headers or "Between ... and ..."
    const headerMatch = text.match(/(?:by\s*and\s*between|agreement\s*with|offer\s*from|company\s*name\s*:)\s*([A-Za-z0-9\s.,&'-]{3,50})/i);
    if (headerMatch && headerMatch[1]) {
      return headerMatch[1].trim();
    }

    // Check first 5 lines for Ltd, LLC, Inc, Technologies
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      if (/(?:pvt\.?\s*ltd\.?|private\s*limited|technologies|solutions|infotech|services|llp|inc\b)/i.test(lines[i])) {
        return lines[i].replace(/[#*_-]/g, '').trim();
      }
    }

    return lines[0] || 'Organization Name As Indicated In Header';
  }

  /**
   * Verifies company against registry
   */
  verify(companyName, rawText = '') {
    const extracted = companyName || this.extractCompanyName(rawText);
    const normalized = extracted.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    // Check simulated registry
    let foundKey = Object.keys(this.simulatedRegistry).find(k => {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      return normalized.includes(cleanK) || cleanK.includes(normalized) || (cleanK.split(' ')[0] === normalized.split(' ')[0] && cleanK.split(' ')[1] === normalized.split(' ')[1]);
    });

    if (foundKey) {
      const rec = this.simulatedRegistry[foundKey];
      return {
        queriedName: extracted,
        companyName: rec.name,
        cin: rec.cin,
        registrationStatus: rec.status,
        state: rec.state,
        authority: rec.authority,
        incorporationDate: rec.incorporationDate,
        officialWebsite: rec.officialWebsite,
        verified: true,
        verificationDate: new Date().toISOString().split('T')[0],
        source: rec.source,
        sourceUrl: rec.sourceUrl,
        disclaimer: '⚠️ Important Note: Official company registration verifies legal existence only. It is NOT an endorsement of fairness, financial safety, or contract terms.',
        notes: rec.notes
      };
    }

    // Default fallback verification object
    return {
      queriedName: extracted,
      companyName: extracted,
      cin: 'Not identified in text',
      registrationStatus: 'Public record check recommended',
      state: 'Unspecified',
      authority: 'Ministry of Corporate Affairs / Registrar of Companies',
      officialWebsite: 'Search on MCA Portal / Google',
      verified: false,
      verificationDate: new Date().toISOString().split('T')[0],
      source: 'Primary Registry Search',
      sourceUrl: 'https://www.mca.gov.in/content/mca/global/en/home.html',
      disclaimer: '⚠️ Company identifier could not be verified automatically against local cache. Please check the company registration on the MCA or local regulatory portal before making any commitments.',
      notes: 'Information could not be verified from the document. Please verify the CIN or registration number on government registries.'
    };
  }
}

module.exports = new CompanyVerifier();
