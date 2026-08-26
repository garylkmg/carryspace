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

  // Feed & Modal State
  const [listings, setListings] = useState(INITIAL_FALLBACK_DATA);
  const [selectedListing, setSelectedListing] = useState(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Settings Restored */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.logo}>CARRY<Text style={styles.logoAccent}>SPACE</Text></Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => Alert.alert('Settings', 'Settings menu coming soon!')}
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

      {/* Modal View */}
      <Modal visible={selectedListing !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Info</Text>
            {selectedListing && (
              <>
                <Text style={styles.modalText}>👤 Name: {selectedListing.name}</Text>
                <Text style={styles.modalText}>✉️ Email: {selectedListing.email}</Text>
                <Text style={styles.modalText}>📞 Phone: {selectedListing.phone}</Text>
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedListing(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    justify: 'space-between', 
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
  modalContent: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, width: '80%' },
  modalTitle: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalText: { color: '#FFFFFF', fontSize: 15, marginBottom: 8 },
  closeButton: { backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  closeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
});