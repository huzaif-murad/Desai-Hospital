import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { listReportsForPatient, getReportById } from '../api/reports';
import { toast } from 'react-toastify';
import HospitalReportTemplate from '../components/HospitalReportTemplate';
import { generateUnifiedMedicalReportPDF } from '../utils/pdfGenerator';

const Reports = () => {
  const { userData } = useContext(AppContext);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        if (!userData?._id) return;
        const { data } = await listReportsForPatient(userData._id);
        if (data.success) {
          setReports(data.reports || []);
          if (data.reports?.length > 0) {
            setSelectedReport(data.reports[0]);
          }
        } else {
          toast.error(data.message);
        }
      } catch (e) {
        toast.error(e.message);
      }
    };
    loadReports();
  }, [userData?._id]);

  useEffect(() => {
    const loadReportDetails = async () => {
      if (!selectedReport) return;
      
      try {
        setLoading(true);
        const { data } = await getReportById(selectedReport._id);
        if (data.success) {
          setReportDetails(data);
          // Set latest version by default
          const latestVersion = selectedReport.versions?.at(-1);
          setSelectedVersion(latestVersion);
        } else {
          toast.error(data.message);
        }
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadReportDetails();
  }, [selectedReport]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!selectedReport || !reportDetails) {
      toast.error('No report selected for download');
      return;
    }

    try {
      const currentVersion = selectedVersion || (reportDetails.versions?.[0] || reportDetails);
      const filename = `Medical_Report_${userData.name || 'Patient'}_${selectedReport._id?.slice(-6) || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await generateUnifiedMedicalReportPDF({
        patientData: userData,
        doctorData: reportDetails.doctorId || {},
        appointmentData: reportDetails.appointmentId || {},
        reportData: reportDetails,
        currentVersion,
        filename
      });
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (!userData) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Please log in to view your reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Health Reports</h1>
      
      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Reports List Sidebar */}
        <div className="bg-white rounded-lg shadow-lg p-4 lg:max-h-[80vh] lg:overflow-hidden lg:flex lg:flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports List</h2>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No medical reports yet.</p>
              <p className="text-gray-400 text-xs mt-1">Reports will appear here after doctor visits.</p>
            </div>
          ) : (
            <div className="space-y-3 lg:flex-1 lg:overflow-y-auto">
              {reports.map((report) => {
                const doctor = report.doctorId || {};
                const latestVersion = report.versions?.at(-1) || {};
                const isActive = selectedReport?._id === report._id;
                
                return (
                  <div
                    key={report._id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {doctor.image ? (
                        <img 
                          src={doctor.image} 
                          alt={doctor.name} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {doctor.name?.charAt(0) || 'D'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Dr. {doctor.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{doctor.speciality || 'General'}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>Latest: {formatDate(latestVersion.updatedAt)}</p>
                      <p>Versions: {report.versions?.length || 0}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Report Details */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : selectedReport && reportDetails ? (
            <div className="p-8">
              {/* Header with Download Button */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Medical Report</h2>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Version Selector */}
              {selectedReport.versions?.length > 1 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Select Version</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {selectedReport.versions.map((version) => (
                      <button
                        key={version._id || version.version}
                        onClick={() => setSelectedVersion(version)}
                        className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                          selectedVersion?.version === version.version
                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        v{version.version}
                        <br />
                        <span className="text-xs opacity-75">
                          {formatDate(version.updatedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hospital Report Template */}
              <div>
                <HospitalReportTemplate
                  mode="read"
                  patientData={reportDetails.patientData || userData}
                  doctorData={reportDetails.doctorData || selectedReport.doctorId}
                  appointmentData={reportDetails.appointmentData || {}}
                  reportData={selectedReport}
                  currentVersion={selectedVersion || {}}
                >
                  {/* Additional Versions History */}
                  {selectedReport.versions?.length > 1 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Version History</h3>
                      <div className="space-y-4">
                        {selectedReport.versions
                          .filter(v => v.version !== selectedVersion?.version)
                        .reverse()
                        .map((version) => (
                          <div 
                            key={version._id || version.version} 
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-medium text-blue-600">
                                Version {version.version}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(version.updatedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 mb-3 text-sm">
                              <div>
                                <span className="font-medium">BP:</span> {version.status?.bp || '-'}
                              </div>
                              <div>
                                <span className="font-medium">Sugar:</span> {version.status?.sugar || '-'}
                              </div>
                              <div>
                                <span className="font-medium">BMI:</span> {version.status?.bmi || '-'}
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Notes:</span>
                              <p className="text-gray-700 mt-1 whitespace-pre-line">
                                {version.description || '-'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </HospitalReportTemplate>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Select a report to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
