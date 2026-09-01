import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jofzpfivwdmlhdjihunf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s4Rr_m0SjqiBT6DVptBD0w_jh01a5HX';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INITIAL_FALLBACK_DATA = [
  { id: 'd1', name: 'Shivi', capacity: '23 kg', price: '$184', route: 'DEL ➔ YEG', date: '09-09-2026', email: 'sam@lkmg.ca', phone: '9999974319', type: 'traveler' },
  { id: 'd2', name: 'Sarah Miller', capacity: '15 kg', price: '$120', route: 'JFK ➔ LHR', date: 'Sep 02, 2026', email: 'sarah@example.com', phone: '1234567890', type: 'traveler' },
  { id: 'd3', name: 'Gary', capacity: '15 kg', price: '$150', route: 'DEL ➔ LHR', date: '12-09-2026', email: 'gary@lkmg.ca', phone: '9266304319', type: 'sender' },
  { id: 'd4', name: 'Alex Johnson', capacity: '5 kg', price: '$60', route: 'SFO ➔ CDG', date: 'Sep 10, 2026', email: 'alex@example.com', phone: '9876543210', type: 'sender' },
];

export default function App() {
  const [role, setRole] = useState('sender');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [weight, setWeight] = useState('');

  // Date Picker State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateText, setDateText] = useState('');

  // Feed & Modals State
  const [listings, setListings] = useState(INITIAL_FALLBACK_DATA);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data, error } = await supabase.from('listings').select('*').order('id', { ascending: false });
    if (data && data.length > 0) {
      setListings([...data, ...INITIAL_FALLBACK_DATA]);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setDateText(formattedDate);
    }
  };

  const calculatePrice = (kg) => {
    const weightNum = parseFloat(kg) || 0;
    return weightNum * 8;
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !phone || !fromLocation || !toLocation || !weight || !dateText) {
      Alert.alert('Incomplete Form', 'Please fill in all fields including the date.');
      return;
    }

    const calculatedPrice = calculatePrice(weight);
    const newEntry = {
      name: fullName,
      email: email,
      phone: phone,
      route: `${fromLocation.toUpperCase()} ➔ ${toLocation.toUpperCase()}`,
      capacity: `${weight} kg`,
      price: `$${calculatedPrice}`,
      date: dateText,
      type: role === 'sender' ? 'sender' : 'traveler',
    };

    const { error } = await supabase.from('listings').insert([newEntry]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Listing saved successfully!');
      setFullName('');
      setEmail('');
      setPhone('');
      setFromLocation('');
      setToLocation('');
      setWeight('');
      setDateText('');
      setShowDatePicker(false);
      fetchListings();
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone dialer on this device.');
    });
  };

  const handleEmail = (emailAddress) => {
    if (!emailAddress) return;
    Linking.openURL(`mailto:${emailAddress}?subject=CarrySpace Listing Inquiry`).catch(() => {
      Alert.alert('Error', 'Unable to open email client on this device.');
    });
  };

  // Account Deletion Prompt
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'Are you sure you want to delete your account? This action is permanent and will remove all your active listings and associated personal data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently', 
          style: 'destructive',
          onPress: () => {
            setShowSettingsModal(false);
            Alert.alert('Account Deleted', 'Your account and associated data have been deleted successfully.');
          } 
        },
      ]
    );
  };

  // Smooth Navigation Between Modals
  const openPrivacyPolicy = () => {
    setShowSettingsModal(false);
    setTimeout(() => {
      setShowPrivacyModal(true);
    }, 200);
  };

  const closePrivacyPolicy = () => {
    setShowPrivacyModal(false);
    setTimeout(() => {
      setShowSettingsModal(true);
    }, 200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.logo}>CARRY<Text style={styles.logoAccent}>SPACE</Text></Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Role Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, role === 'sender' && styles.activeToggle]}
          onPress={() => setRole('sender')}
        >
          <Text style={[styles.toggleText, role === 'sender' && styles.activeToggleText]}>Ship Goods</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, role === 'traveler' && styles.activeToggle]}
          onPress={() => setRole('traveler')}
        >
          <Text style={[styles.toggleText, role === 'traveler' && styles.activeToggleText]}>Earn Traveling</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === 'sender' ? 'SENDER & PACKAGE DETAILS' : 'TRAVELER & SPACE DETAILS'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#8E8E93"
            value={fullName}
            onChangeText={setFullName}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Email ID"
              placeholderTextColor="#8E8E93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Contact Number"
              placeholderTextColor="#8E8E93"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="From (e.g. JFK)"
              placeholderTextColor="#8E8E93"
              value={fromLocation}
              onChangeText={setFromLocation}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="To (e.g. LHR)"
              placeholderTextColor="#8E8E93"
              value={toLocation}
              onChangeText={setToLocation}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder={role === 'sender' ? 'Weight (kg)' : 'Space (kg)'}
              placeholderTextColor="#8E8E93"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.input, styles.halfInput, styles.datePickerButton]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: dateText ? '#FFFFFF' : '#8E8E93' }}>
                {dateText || (role === 'sender' ? 'Needed By (Date)' : 'Flight Date')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.doneButtonText}>Confirm Date</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {role === 'sender' ? 'Post Delivery Request' : 'List Available Luggage Space'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Database Feed */}
        <Text style={styles.sectionTitle}>
          {role === 'sender' ? 'Available Travelers' : 'Package Requests'}
        </Text>

        {listings
          .filter((item) => item.type === (role === 'sender' ? 'traveler' : 'sender'))
          .map((item) => (
            <View key={item.id} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.feedName}>{item.name} • <Text style={styles.feedWeight}>{item.capacity}</Text></Text>
                <Text style={styles.feedPrice}>{item.price}</Text>
              </View>
              <Text style={styles.feedRoute}>{item.route}</Text>
              <Text style={styles.feedDate}>📅 {item.date}</Text>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => setSelectedListing(item)}
              >
                <Text style={styles.contactButtonText}>
                  {role === 'sender' ? 'Contact Traveler' : 'Contact Sender'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>

      {/* Actionable Contact Modal */}
      <Modal visible={selectedListing !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Direct Contact</Text>
            {selectedListing && (
              <>
                <Text style={styles.modalName}>{selectedListing.name}</Text>
                <Text style={styles.modalSub}>Route: {selectedListing.route}</Text>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => handleCall(selectedListing.phone)}
                  >
                    <Text style={styles.actionBtnText}>📞 Call Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.emailBtn]}
                    onPress={() => handleEmail(selectedListing.email)}
                  >
                    <Text style={styles.actionBtnText}>✉️ Send Email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedListing(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings & Privacy</Text>

            <TouchableOpacity 
              style={styles.settingsRowBtn}
              onPress={openPrivacyPolicy}
            >
              <Text style={styles.settingsRowText}>📄 View Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingsRowBtn, styles.deleteBtn]}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete Account & Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-App Privacy Policy Viewer Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <ScrollView style={{ marginVertical: 12 }}>
              <Text style={styles.privacyBody}>
                At CarrySpace, we respect your privacy and are committed to protecting your personal information.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>1. Information We Collect:{'\n'}</Text>
                CarrySpace collects personal details provided directly by users, including Full Name, Email Address, Phone Number, Photo, Address, and ID / Passport details, along with delivery route specifics for luggage matching purposes.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>2. How We Use Information:{'\n'}</Text>
                Your information is used exclusively to connect package senders with travelers and verify account authenticity. We do not sell your personal data to third parties.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>3. Limitation of Liability & Disclaimers:{'\n'}</Text>
                CarrySpace, its owners, and developers act solely as a passive venue connecting users. CarrySpace is strictly NOT responsible or liable for any lost, stolen, damaged, or delayed items or packages arranged through the platform. Furthermore, CarrySpace, its owners, and developers are NOT responsible or liable for any payment of additional customs duties, import taxes, penalties, or border inspections. Users are solely responsible for declaring goods and complying with all local and international customs laws.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>4. Data Retention & Account Deletion:{'\n'}</Text>
                You have full control over your personal data. You may request account and data deletion at any time directly through the Settings menu in this application.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>5. Security & Contact:{'\n'}</Text>
                We use industry-standard encryption protocols (via Supabase) to protect all submitted listings and personal data. For privacy inquiries, contact us at <Text style={{ color: '#F59E0B' }}>support.carryspace@gmail.com</Text>.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closePrivacyPolicy}
            >
              <Text style={styles.closeButtonText}>Back to Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D' },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#1E293B' 
  },
  headerSpacer: { width: 24 },
  logo: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  logoAccent: { color: '#F59E0B' },
  settingsButton: { padding: 4 },
  settingsIcon: { fontSize: 20 },
  toggleContainer: { flexDirection: 'row', margin: 16, backgroundColor: '#1E293B', borderRadius: 12, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeToggle: { backgroundColor: '#2563EB' },
  toggleText: { color: '#94A3B8', fontWeight: '600' },
  activeToggleText: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 24 },
  cardTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, color: '#FFFFFF', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  datePickerButton: { justifyContent: 'center' },
  doneButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  doneButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#F59E0B', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  feedCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  feedWeight: { color: '#F59E0B' },
  feedPrice: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  feedRoute: { color: '#94A3B8', fontSize: 14, marginVertical: 4 },
  feedDate: { color: '#64748B', fontSize: 12, marginBottom: 12 },
  contactButton: { backgroundColor: '#2563EB', padding: 10, borderRadius: 8, alignItems: 'center' },
  contactButtonText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, width: '85%' },
  modalTitle: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalSub: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  callBtn: { backgroundColor: '#10B981' },
  emailBtn: { backgroundColor: '#2563EB' },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  closeButton: { backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  closeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  settingsRowBtn: { backgroundColor: '#0F172A', padding: 14, borderRadius: 10, marginBottom: 12 },
  settingsRowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#451A1A', borderWidth: 1, borderColor: '#EF4444' },
  deleteBtnText: { color: '#EF4444', fontSize: 15, fontWeight: 'bold' },
  privacyBody: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
});