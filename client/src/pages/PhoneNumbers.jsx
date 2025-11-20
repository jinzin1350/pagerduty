import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PhoneNumbers.css';

function PhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    phone_number: '',
    escalation_order: 1
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      const response = await api.get('/phone-numbers');
      setPhoneNumbers(response.data.phoneNumbers);
      setError('');
    } catch (err) {
      setError('Failed to load phone numbers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/phone-numbers', {
        ...formData,
        escalation_order: parseInt(formData.escalation_order)
      });

      setShowForm(false);
      setFormData({
        contact_name: '',
        phone_number: '',
        escalation_order: phoneNumbers.length + 1
      });
      fetchPhoneNumbers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add phone number');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/phone-numbers/${id}`, {
        is_active: !currentStatus
      });
      fetchPhoneNumbers();
    } catch (err) {
      setError('Failed to update phone number');
    }
  };

  const deletePhoneNumber = async (id) => {
    if (!confirm('Are you sure you want to delete this phone number?')) {
      return;
    }

    try {
      await api.delete(`/phone-numbers/${id}`);
      fetchPhoneNumbers();
    } catch (err) {
      setError('Failed to delete phone number');
    }
  };

  if (loading) {
    return <div className="loading">Loading phone numbers...</div>;
  }

  return (
    <div className="phone-numbers-page">
      <div className="page-header">
        <h1>Phone Numbers</h1>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add Phone Number'}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card">
          <h2>Add Phone Number</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  placeholder="+1234567890"
                />
              </div>

              <div className="form-group">
                <label>Escalation Order</label>
                <input
                  type="number"
                  name="escalation_order"
                  value={formData.escalation_order}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Add Phone Number
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Escalation Chain</h2>
        <p className="help-text">
          Phone numbers will be called in this order until someone confirms receipt.
        </p>

        {phoneNumbers.length === 0 ? (
          <p className="empty-state">No phone numbers configured yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Contact Name</th>
                <th>Phone Number</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((phone) => (
                <tr key={phone.id} className={!phone.is_active ? 'inactive-row' : ''}>
                  <td>
                    <span className="order-badge">{phone.escalation_order}</span>
                  </td>
                  <td>{phone.contact_name}</td>
                  <td>{phone.phone_number}</td>
                  <td>
                    {phone.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-danger">Inactive</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleActive(phone.id, phone.is_active)}
                        >
                          {phone.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deletePhoneNumber(phone.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PhoneNumbers;
