import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Emails.css';

function Emails() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await api.get('/emails?limit=50');
      setEmails(response.data.emails);
      setError('');
    } catch (err) {
      setError('Failed to load emails');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewEmailDetails = async (emailId) => {
    try {
      const response = await api.get(`/emails/${emailId}`);
      setSelectedEmail(response.data);
    } catch (err) {
      console.error('Failed to load email details:', err);
    }
  };

  const getCallStatusBadge = (calls) => {
    if (!calls || calls.length === 0) {
      return <span className="badge badge-warning">No Calls</span>;
    }

    const confirmed = calls.some(call => call.confirmed);
    if (confirmed) {
      return <span className="badge badge-success">Confirmed</span>;
    }

    const inProgress = calls.some(call =>
      ['initiated', 'queued', 'ringing', 'in-progress'].includes(call.status)
    );
    if (inProgress) {
      return <span className="badge badge-info">In Progress</span>;
    }

    return <span className="badge badge-danger">Failed</span>;
  };

  if (loading) {
    return <div className="loading">Loading emails...</div>;
  }

  return (
    <div className="emails-page">
      <h1>Critical Emails</h1>

      {error && <div className="error">{error}</div>}

      <div className="emails-container">
        <div className="emails-list card">
          {emails.length === 0 ? (
            <p className="empty-state">No emails received yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Received</th>
                  <th>Calls</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id}>
                    <td>
                      <strong>{email.subject}</strong>
                    </td>
                    <td>{email.sender}</td>
                    <td>{new Date(email.received_at).toLocaleString()}</td>
                    <td>{email.calls?.length || 0}</td>
                    <td>{getCallStatusBadge(email.calls)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => viewEmailDetails(email.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedEmail && (
          <div className="email-details card">
            <div className="email-details-header">
              <h2>Email Details</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedEmail(null)}
              >
                Close
              </button>
            </div>

            <div className="email-meta">
              <div><strong>From:</strong> {selectedEmail.sender}</div>
              <div><strong>Subject:</strong> {selectedEmail.subject}</div>
              <div><strong>Received:</strong> {new Date(selectedEmail.received_at).toLocaleString()}</div>
            </div>

            <div className="email-body">
              <h3>Message</h3>
              <p>{selectedEmail.full_body || selectedEmail.body_preview}</p>
            </div>

            <div className="email-calls">
              <h3>Call Logs ({selectedEmail.calls?.length || 0})</h3>
              {selectedEmail.calls && selectedEmail.calls.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Attempt</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmail.calls.map((call) => (
                      <tr key={call.id}>
                        <td>{call.contact_name}</td>
                        <td>{call.phone_number}</td>
                        <td>
                          {call.confirmed ? (
                            <span className="badge badge-success">Confirmed</span>
                          ) : (
                            <span className="badge badge-danger">{call.status}</span>
                          )}
                        </td>
                        <td>Loop {call.loop_number}, Attempt {call.attempt_number}</td>
                        <td>{new Date(call.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">No calls made yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Emails;
