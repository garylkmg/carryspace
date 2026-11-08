import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const SUPABASE_URL = 'https://jofzpfivwdmlhdjihunf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s4Rr_m0SjqiBT6DVptBD0w_jh01a5HX';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INITIAL_FALLBACK_DATA = [
  {
    id: 'd1',
    name: 'Shivi',
    capacity: '23 kg',
    price: '$230',
    route: 'DEL ➔ YEG',
    date: '09-09-2026',
    email: 'sam@lkmg.ca',
    phone: '9999974319',
    type: 'traveler',
    user_id: '11111111-1111-1111-1111-111111111111',
    is_mock: true,
    status: 'pending',
    description: 'Personal baggage space',
    item_category: 'Customs-Free Items',
  },
  {
    id: 'd2',
    name: 'Sarah Miller',
    capacity: '15 kg',
    price: '$105',
    route: 'JFK ➔ LHR',
    date: 'Sep 02, 2026',
    email: 'sarah@example.com',
    phone: '1234567890',
    type: 'traveler',
    user_id: '22222222-2222-2222-2222-222222222222',
    is_mock: true,
    status: 'pending',
    description: 'Clothes and shoes',
    item_category: 'Customs-Free Items',
  },
  {
    id: 'd3',
    name: 'Gary',
    capacity: '15 kg',
    price: '$131',
    route: 'DEL ➔ LHR',
    date: '12-09-2026',
    email: 'gary@lkmg.ca',
    phone: '9266304319',
    type: 'sender',
    user_id: '33333333-3333-3333-3333-333333333333',
    is_mock: true,
    status: 'pending',
    description: 'Sealed camera lenses & laptop',
    item_category: 'Customs Declaration Required',
  },
  {
    id: 'd4',
    name: 'Alex Johnson',
    capacity: '5 kg',
    price: '$30',
    route: 'SFO ➔ LAX',
    date: 'Sep 10, 2026',
    email: 'alex@example.com',
    phone: '9876543210',
    type: 'sender',
    user_id: '44444444-4444-4444-4444-444444444444',
    is_mock: true,
    status: 'pending',
    description: 'Prescription herbal medicine',
    item_category: 'Restricted Items',
  },
];

export default function App() {
  const [role, setRole] = useState<'sender' | 'traveler'>('sender');
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Auth & Verification Screen State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('Customs-Free Items');

  // Modal States
  const [date, setDate] = useState(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [dateText, setDateText] = useState('');

  // Feed & Listings State
  const [listings, setListings] = useState<any[]>(INITIAL_FALLBACK_DATA);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Searching Animation State
  const [isSearching, setIsSearching] = useState(false);

  // In-App Messaging & Inbox State
  const [allUserMessages, setAllUserMessages] = useState<any[]>([]);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Live Location Tracking State
  const [showLiveTrackingModal, setShowLiveTrackingModal] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    checkActiveSession();
    fetchListings();
    requestInitialLocation();
  }, []);

  // Listen for realtime updates to listings (for live tracking and status updates)
  useEffect(() => {
    const listingsChannel = supabase
      .channel('public:listings_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings' },
        (payload) => {
          setListings((prev) =>
            prev.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings' },
        (payload) => {
          setListings((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  // Listen for messages involving this user to keep inbox updated
  useEffect(() => {
    if (user) {
      fetchAllUserMessages();

      const msgChannel = supabase
        .channel('public:user_inbox')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
              setAllUserMessages((prev) => [newMsg, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
      };
    }
  }, [user]);

  const requestInitialLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch {
      // Non-fatal if location permission is declined or in simulator
    }
  };

  const userListings = listings.filter((item) => item.user_id === user?.id);
  const activeUserListing = userListings.length > 0 ? userListings[0] : null;

  // Automated GPS Publisher when status is "in_transit"
  useEffect(() => {
    let locationSubscription: any;

    const startAutomatedTracking = async () => {
      if (role === 'traveler' && activeUserListing?.status === 'in_transit') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            setCurrentCoords({ latitude, longitude });

            if (activeUserListing.id && typeof activeUserListing.id === 'number') {
              await supabase
                .from('listings')
                .update({
                  live_lat: latitude,
                  live_lng: longitude,
                  is_tracking_active: true,
                })
                .eq('id', activeUserListing.id);
            }
          }
        );
      }
    };

    startAutomatedTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [activeUserListing?.status, role]);

  // Realtime Chat Subscription for active thread
  useEffect(() => {
    if (!user || !chatPartner) return;

    fetchMessages();

    if (chatPartner.is_mock) return;

    const channel = supabase
      .channel(`chat_${chatPartner.user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === chatPartner.user_id) ||
            (newMsg.sender_id === chatPartner.user_id && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatPartner, user]);

  const checkActiveSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
    setLoadingSession(false);

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  };

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .order('id', { ascending: false });
    if (data && data.length > 0) {
      setListings([...data, ...INITIAL_FALLBACK_DATA]);
    }
  };

  const fetchAllUserMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      setAllUserMessages((prev) => {
        const localMock = prev.filter((m) => String(m.id).startsWith('mock-'));
        return [...data, ...localMock];
      });
    }
  };

  // Group messages into distinct conversation threads
  const conversationThreads = useMemo(() => {
    if (!user) return [];

    const partnerMap = new Map<string, any>();

    allUserMessages.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerMap.has(partnerId)) {
        const matchingListing = listings.find((l) => l.user_id === partnerId);
        partnerMap.set(partnerId, {
          partnerId,
          name: matchingListing ? matchingListing.name : 'CarrySpace User',
          route: matchingListing ? matchingListing.route : 'Delivery Route',
          phone: matchingListing ? matchingListing.phone : '',
          lastMessage: msg.text,
          lastDate: msg.created_at,
          listing: matchingListing || null,
        });
      }
    });

    return Array.from(partnerMap.values());
  }, [allUserMessages, user, listings]);

  // Chat Actions
  const fetchMessages = async () => {
    if (!user || !chatPartner) return;

    if (chatPartner.is_mock) {
      setMessages([
        {
          id: 'mock-1',
          sender_id: chatPartner.user_id,
          receiver_id: user.id,
          text: `Hi! Feel free to coordinate delivery details with me here.`,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${chatPartner.user_id}),and(sender_id.eq.${chatPartner.user_id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!user || !chatPartner || !newMessageText.trim()) return;

    const trimmed = newMessageText.trim();

    if (chatPartner.is_mock) {
      const localMsg = {
        id: `mock-${Date.now()}`,
        sender_id: user.id,
        receiver_id: chatPartner.user_id,
        text: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, localMsg]);
      setAllUserMessages((prev) => [localMsg, ...prev]);
      setNewMessageText('');
      return;
    }

    const msgData = {
      sender_id: user.id,
      receiver_id: chatPartner.user_id,
      listing_id: chatPartner.id && !isNaN(Number(chatPartner.id)) ? Number(chatPartner.id) : null,
      text: trimmed,
    };

    const { data, error } = await supabase.from('messages').insert([msgData]).select();

    if (error) {
      Alert.alert('Message Error', error.message);
    } else {
      setNewMessageText('');
      if (data && data[0]) {
        setAllUserMessages((prev) => [data[0], ...prev]);
      }
    }
  };

  const handleAcceptAndInstantContact = async (item: any) => {
    if (!user) return;

    if (item.user_id === user.id) {
      Alert.alert('Notice', 'You cannot accept your own listing.');
      return;
    }

    if (item.email && !item.is_mock) {
      await supabase.from('email_queue').insert([
        {
          recipient_email: item.email,
          subject: '🎉 CarrySpace: Someone accepted your listing!',
          body: `Hello ${item.name},\n\nA user has accepted your listing (${item.route}) on CarrySpace and opened a direct chat with you.\n\nOpen CarrySpace to view the message!`,
        },
      ]);
    }

    setMessages([]);
    setChatPartner(item);
    setShowChatModal(true);
  };

  const handleOpenConversation = (thread: any) => {
    setShowInboxModal(false);
    const isMock =
      thread.partnerId.startsWith('1111') ||
      thread.partnerId.startsWith('2222') ||
      thread.partnerId.startsWith('3333') ||
      thread.partnerId.startsWith('4444') ||
      thread.listing?.is_mock;

    setMessages([]);
    setChatPartner({
      name: thread.name,
      user_id: thread.partnerId,
      route: thread.route,
      phone: thread.phone,
      id: thread.listing?.id || null,
      is_mock: !!isMock,
    });

    setTimeout(() => {
      setShowChatModal(true);
    }, 200);
  };

  // Camera Actions
  const handleTakeIdPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take photo ID verification.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setIdPhoto(result.assets[0].uri);
    }
  };

  const handleTakeFacePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take live face verification photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setFacePhoto(result.assets[0].uri);
    }
  };

  // Auth Actions
  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      Alert.alert('Incomplete Fields', 'Please enter both email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (!authFullName) {
        Alert.alert('Incomplete Fields', 'Please enter your Full Name.');
        return;
      }

      if (!idPhoto) {
        Alert.alert('Verification Required', 'Please take/upload a clear photo of your ID or Passport.');
        return;
      }

      if (!facePhoto) {
        Alert.alert('Verification Required', 'Please take a live face photo via camera for identity verification.');
        return;
      }

      setIsVerifying(true);

      setTimeout(async () => {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authFullName,
              id_verified: true,
              id_photo_url: idPhoto,
              face_photo_url: facePhoto,
            },
          },
        });

        setIsVerifying(false);

        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          Alert.alert('Account Verified & Created', 'Identity verified successfully! Welcome to CarrySpace.');
          setUser(data.user);
          setAuthFullName('');
          setAuthEmail('');
          setAuthPassword('');
          setIdPhoto(null);
          setFacePhoto(null);
        }
      }, 3000);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        Alert.alert('Login Error', error.message);
      } else {
        setUser(data.user);
        setAuthEmail('');
        setAuthPassword('');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowSettingsModal(false);
    Alert.alert('Signed Out', 'You have been logged out.');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setDateText(formattedDate);
    }
    if (Platform.OS === 'android') {
      setShowDatePickerModal(false);
    }
  };

  const confirmDateSelection = () => {
    if (!dateText) {
      const formattedDate = date.toISOString().split('T')[0];
      setDateText(formattedDate);
    }
    setShowDatePickerModal(false);
  };

  const calculatePrice = (kg: string, from: string, to: string, category: string) => {
    const weightNum = parseFloat(kg) || 0;
    if (!weightNum) return 0;

    const origin = (from || '').toUpperCase().trim();
    const destination = (to || '').toUpperCase().trim();

    let baseRatePerKg = 4;
    const longHaulAirports = ['DEL', 'BOM', 'BLR', 'YEG', 'YYZ', 'YVR', 'SYD', 'MEL'];
    const isLongHaul = longHaulAirports.includes(origin) || longHaulAirports.includes(destination);

    if (isLongHaul) {
      baseRatePerKg = 10;
    } else if (origin !== destination) {
      baseRatePerKg = 7;
    }

    let rawPrice = weightNum * baseRatePerKg;

    if (category === 'Customs Declaration Required') {
      rawPrice *= 1.25;
    } else if (category === 'Restricted Items') {
      rawPrice *= 1.50;
    }

    return Math.round(rawPrice);
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !phone || !fromLocation || !toLocation || !weight || !dateText || !description) {
      Alert.alert('Incomplete Form', 'Please fill in all fields including item details and travel date.');
      return;
    }

    const calculatedPrice = calculatePrice(weight, fromLocation, toLocation, itemCategory);

    const newEntry = {
      name: fullName,
      email: email,
      phone: phone,
      route: `${fromLocation.toUpperCase()} ➔ ${toLocation.toUpperCase()}`,
      capacity: `${weight} kg (${itemCategory})`,
      price: `$${calculatedPrice}`,
      date: dateText,
      type: role === 'sender' ? 'sender' : 'traveler',
      user_id: user ? user.id : null,
      status: 'pending',
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
      setDescription('');
      setDateText('');
      fetchListings();

      setIsSearching(true);
      setTimeout(() => {
        setIsSearching(false);
      }, 5000);
    }
  };

  const handleUpdateListingStatus = async (listingId: any, newStatus: string) => {
    if (typeof listingId === 'string' && listingId.startsWith('d')) {
      setListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, status: newStatus } : item))
      );
      if (newStatus === 'in_transit') {
        setShowLiveTrackingModal(true);
        Alert.alert('Package Handed Over', 'Package is now In Transit! Live GPS tracking activated.');
      } else if (newStatus === 'completed') {
        setShowLiveTrackingModal(false);
        Alert.alert('Delivery Complete', 'Package delivered successfully. Live GPS tracking ended.');
      }
      return;
    }

    const { error } = await supabase
      .from('listings')
      .update({
        status: newStatus,
        is_tracking_active: newStatus === 'in_transit',
      })
      .eq('id', listingId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchListings();
      if (newStatus === 'in_transit') {
        setShowLiveTrackingModal(true);
        Alert.alert('Package Handed Over', 'Package is now In Transit! Live GPS tracking activated.');
      } else if (newStatus === 'completed') {
        setShowLiveTrackingModal(false);
        Alert.alert('Delivery Complete', 'Package delivered successfully. Live GPS tracking ended.');
      }
    }
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone dialer on this device.');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Personal Data',
      'Deleting your account permanently revokes login access and strips personal identification from your listings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await supabase
                .from('listings')
                .update({ name: 'Anonymized User', email: 'redacted@carryspace.app', phone: '0000000000' })
                .eq('user_id', user.id);

              await supabase.rpc('delete_user_account');
              await supabase.auth.signOut();
              setUser(null);
              setShowSettingsModal(false);
              Alert.alert('Account Deleted', 'Your account credentials and personal identity details have been deleted.');
              fetchListings();
            }
          },
        },
      ]
    );
  };

  const openPrivacyPolicy = () => {
    setShowSettingsModal(false);
    setTimeout(() => setShowPrivacyModal(true), 200);
  };

  const closePrivacyPolicy = () => {
    setShowPrivacyModal(false);
    setTimeout(() => setShowSettingsModal(true), 200);
  };

  if (loadingSession) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.authScrollContainer}>
          <View style={styles.authContainer}>
            <Text style={styles.authLogo} numberOfLines={1}>
              CARRY<Text style={styles.logoAccent}>SPACE</Text>
            </Text>
            <Text style={styles.authSubtitle}>Peer-to-Peer Luggage Space Sharing</Text>

            <View style={styles.authToggleRow}>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
                onPress={() => setAuthMode('login')}
                disabled={isVerifying}
              >
                <Text style={styles.authTabText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'signup' && styles.authTabActive]}
                onPress={() => setAuthMode('signup')}
                disabled={isVerifying}
              >
                <Text style={styles.authTabText}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {authMode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#8E8E93"
                value={authFullName}
                onChangeText={setAuthFullName}
                editable={!isVerifying}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#8E8E93"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isVerifying}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8E8E93"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
              editable={!isVerifying}
            />

            {authMode === 'signup' && (
              <View style={styles.verificationSection}>
                <Text style={styles.verificationTitle}>🔒 ID & Live Verification Required</Text>
                <Text style={styles.verificationSub}>
                  Upload Passport/ID and take a live face selfie to unlock peer-to-peer sharing.
                </Text>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.uploadBox, idPhoto ? styles.uploadBoxDone : null]}
                    onPress={handleTakeIdPhoto}
                    disabled={isVerifying}
                  >
                    {idPhoto ? (
                      <Image source={{ uri: idPhoto }} style={styles.previewImage} />
                    ) : (
                      <>
                        <Text style={styles.uploadIcon}>🪪</Text>
                        <Text style={styles.uploadLabel}>Photo ID / Passport</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.uploadBox, facePhoto ? styles.uploadBoxDone : null]}
                    onPress={handleTakeFacePhoto}
                    disabled={isVerifying}
                  >
                    {facePhoto ? (
                      <Image source={{ uri: facePhoto }} style={styles.previewImage} />
                    ) : (
                      <>
                        <Text style={styles.uploadIcon}>📸</Text>
                        <Text style={styles.uploadLabel}>Take Face Selfie</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isVerifying ? (
              <View style={styles.verifyingOverlayBox}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.verifyingOverlayText}>Verifying Face & Photo ID...</Text>
                <Text style={styles.verifyingSubText}>Processing identity compliance check</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleAuth}>
                <Text style={styles.submitButtonText}>
                  {authMode === 'login' ? 'Log In to CarrySpace' : 'Verify & Create Account'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const userGreetingName = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ')[0]
    : user.email
    ? user.email.split('@')[0].split('.')[0]
    : 'User';

  const targetType = role === 'sender' ? 'traveler' : 'sender';
  const partnerMatch =
    listings.find((item) => item.type === targetType && item.user_id !== user?.id) ||
    INITIAL_FALLBACK_DATA[0];

  const estimatedPrice = calculatePrice(weight, fromLocation, toLocation, itemCategory);

  // Position coordinates determination:
  // For traveler: live phone coords take priority.
  // For sender: package/traveler's live_lat from database takes priority.
  const mapLatitude =
    role === 'traveler'
      ? currentCoords?.latitude || activeUserListing?.live_lat || 28.6139
      : activeUserListing?.live_lat || currentCoords?.latitude || 28.6139;

  const mapLongitude =
    role === 'traveler'
      ? currentCoords?.longitude || activeUserListing?.live_lng || 77.209
      : activeUserListing?.live_lng || currentCoords?.longitude || 77.209;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.userGreeting} numberOfLines={1}>
          Hello, {userGreetingName.charAt(0).toUpperCase() + userGreetingName.slice(1)}
        </Text>
        <View style={styles.logoContainer}>
          <Text style={styles.logo} numberOfLines={1} adjustsFontSizeToFit>
            CARRY<Text style={styles.logoAccent}>SPACE</Text>
          </Text>
        </View>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.inboxHeaderButton}
            onPress={() => {
              fetchAllUserMessages();
              setShowInboxModal(true);
            }}
          >
            <Text style={styles.inboxIcon}>💬</Text>
            {conversationThreads.length > 0 && (
              <View style={styles.inboxBadge}>
                <Text style={styles.inboxBadgeText}>{conversationThreads.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, role === 'sender' && styles.activeToggle]}
          onPress={() => setRole('sender')}
        >
          <Text style={[styles.toggleText, role === 'sender' && styles.activeToggleText]}>
            Ship Goods
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, role === 'traveler' && styles.activeToggle]}
          onPress={() => setRole('traveler')}
        >
          <Text style={[styles.toggleText, role === 'traveler' && styles.activeToggleText]}>
            Earn Traveling
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 320 }]}>
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
              onPress={() => setShowDatePickerModal(true)}
            >
              <Text style={{ color: dateText ? '#FFFFFF' : '#8E8E93' }}>
                {dateText || (role === 'sender' ? 'Needed By (Date)' : 'Flight Date')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.input, styles.goodsSelectorButton]}
            onPress={() => setShowGoodsModal(true)}
          >
            <Text style={{ color: description ? '#FFFFFF' : '#8E8E93' }} numberOfLines={1}>
              {description
                ? `📦 ${description} (${itemCategory})`
                : role === 'traveler'
                ? '📦 Goods you would like to carry'
                : '📦 Describe Goods & Select Customs Class'}
            </Text>
          </TouchableOpacity>

          {weight !== '' && (
            <View style={styles.priceEstimateBox}>
              <Text style={styles.priceEstimateText}>
                Estimated Price: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>${estimatedPrice}</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {role === 'sender' ? 'Post Delivery Request' : 'List Available Luggage Space'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Public Feed */}
        <Text style={styles.sectionTitle}>
          {role === 'sender' ? 'Available Travelers' : 'Package Requests'}
        </Text>

        {listings
          .filter((item) => item.type === (role === 'sender' ? 'traveler' : 'sender') && item.status !== 'completed')
          .map((item) => (
            <View key={item.id} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.feedName}>
                  {item.name} • <Text style={styles.feedWeight}>{item.capacity}</Text>
                </Text>
                <Text style={styles.feedPrice}>{item.price}</Text>
              </View>
              <Text style={styles.feedRoute}>{item.route}</Text>
              {item.description ? <Text style={styles.feedDesc}>📦 Items: {item.description}</Text> : null}
              {item.item_category ? <Text style={styles.feedCatTag}>🏷️ {item.item_category}</Text> : null}
              <Text style={styles.feedDate}>📅 {item.date}</Text>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleAcceptAndInstantContact(item)}
              >
                <Text style={styles.contactButtonText}>💬 Accept & Chat Instantly</Text>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>

      {/* Pop-up Goods Description & Customs Modal */}
      <Modal visible={showGoodsModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContentCard}>
              <Text style={styles.modalTitle}>
                {role === 'traveler' ? 'Goods you would like to carry' : 'Description of Goods'}
              </Text>

              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder={
                  role === 'traveler'
                    ? 'Message for sender (for example write): Personal Luggage only'
                    : 'List items (e.g. Clothes, Shoes, Laptop, Medicines)'
                }
                placeholderTextColor="#8E8E93"
                value={description}
                onChangeText={setDescription}
                multiline
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <Text style={styles.categoryTitle}>Customs Classification:</Text>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  itemCategory === 'Customs-Free Items' && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setItemCategory('Customs-Free Items');
                }}
              >
                <Text style={styles.categoryOptionText}>
                  {itemCategory === 'Customs-Free Items' ? '🔘' : '⚪'} Customs-Free Items
                </Text>
                <Text style={styles.categoryDescText}>Standard Rate</Text>
              </TouchableOpacity>

              <View style={styles.earnMoreBanner}>
                <Text style={styles.earnMoreBannerText}>
                  {role === 'sender'
                    ? '⭐ Pay a little extra to ask for extra help:'
                    : '⭐ Earn More with a little hassle:'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  itemCategory === 'Customs Declaration Required' && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setItemCategory('Customs Declaration Required');
                }}
              >
                <Text style={styles.categoryOptionText}>
                  {itemCategory === 'Customs Declaration Required' ? '🔘' : '⚪'} Customs Declaration Required
                </Text>
                <Text style={styles.categoryDescText}>+25% Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  itemCategory === 'Restricted Items' && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setItemCategory('Restricted Items');
                }}
              >
                <Text style={styles.categoryOptionText}>
                  {itemCategory === 'Restricted Items' ? '🔘' : '⚪'} Restricted Items
                </Text>
                <Text style={styles.categoryDescText}>+50% Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowGoodsModal(false);
                }}
              >
                <Text style={styles.confirmModalButtonText}>Confirm Item Details</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Pop-up Date Picker Modal */}
      <Modal visible={showDatePickerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalCard}>
            <Text style={styles.modalTitle}>Select Flight / Needed Date</Text>

            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.confirmDateButton} onPress={confirmDateSelection}>
              <Text style={styles.confirmDateButtonText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Bottom Status Sheet */}
      <View style={styles.bottomStatusSheet}>
        <View style={styles.sheetHandle} />

        {activeUserListing && (
          <View style={styles.searchingContainer}>
            {isSearching ? (
              <View style={styles.bufferingBox}>
                <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={styles.bufferingText}>
                  {activeUserListing.type === 'sender'
                    ? 'Searching for nearby travelers...'
                    : 'Searching for nearby delivery requests...'}
                </Text>
              </View>
            ) : (
              <View style={styles.matchCard}>
                <View style={styles.feedHeader}>
                  <Text style={styles.matchTitle}>🎉 Match Found ({partnerMatch.route})</Text>
                  <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 11 }}>
                    {activeUserListing.status ? activeUserListing.status.toUpperCase() : 'ACTIVE'}
                  </Text>
                </View>
                <Text style={styles.matchDetails}>
                  Partner: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{partnerMatch.name}</Text> •{' '}
                  {partnerMatch.capacity}
                </Text>

                <View style={[styles.actionRow, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.callBtn, { paddingVertical: 6 }]}
                    onPress={() => handleCall(partnerMatch.phone)}
                  >
                    <Text style={styles.actionBtnText}>📞 Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.emailBtn, { paddingVertical: 6 }]}
                    onPress={() => {
                      setChatPartner(partnerMatch);
                      setShowChatModal(true);
                    }}
                  >
                    <Text style={styles.actionBtnText}>💬 Chat</Text>
                  </TouchableOpacity>

                  {activeUserListing.status === 'in_transit' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#F59E0B', paddingVertical: 6 }]}
                      onPress={() => setShowLiveTrackingModal(true)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#0F172A' }]}>📡 Live Map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
          <Text style={styles.bottomSheetSectionTitle}>📦 Package Lifecycle & History</Text>
          {userListings.length === 0 ? (
            <Text style={styles.emptySheetText}>No past history or active listings found.</Text>
          ) : (
            userListings.map((item) => (
              <View key={item.id} style={styles.innerCard}>
                <View style={styles.feedHeader}>
                  <Text style={styles.innerCardText}>{item.route}</Text>
                  <Text
                    style={[
                      styles.badgeText,
                      item.status === 'completed' ? { color: '#10B981' } : { color: '#F59E0B' },
                    ]}
                  >
                    {item.status ? item.status.toUpperCase() : 'PENDING'}
                  </Text>
                </View>
                <Text style={styles.innerCardSubText}>
                  Capacity: {item.capacity} • Price: {item.price}
                </Text>

                <View style={[styles.actionRow, { marginTop: 8 }]}>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      item.status === 'in_transit' && { backgroundColor: '#D97706' },
                    ]}
                    onPress={() => handleUpdateListingStatus(item.id, 'in_transit')}
                  >
                    <Text style={styles.statusToggleText}>Handover (In Transit)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      item.status === 'completed' && styles.statusToggleBtnActiveCompleted,
                    ]}
                    onPress={() => handleUpdateListingStatus(item.id, 'completed')}
                  >
                    <Text style={styles.statusToggleText}>Delivered (Complete)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Messages Inbox / Conversations List Modal */}
      <Modal visible={showInboxModal} animationType="slide">
        <SafeAreaView style={[styles.container, { flex: 1 }]}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowInboxModal(false)} style={styles.chatBackBtn}>
              <Text style={styles.chatBackBtnText}>◀ Close</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.chatHeaderTitle}>All Conversations</Text>
              <Text style={styles.chatHeaderSub}>Recent inquiries & carrier messages</Text>
            </View>
            <View style={{ width: 45 }} />
          </View>

          {conversationThreads.length === 0 ? (
            <View style={styles.emptyInboxBox}>
              <Text style={styles.emptyInboxIcon}>💬</Text>
              <Text style={styles.emptyInboxTitle}>No conversations yet</Text>
              <Text style={styles.emptyInboxSub}>
                When you or another user initiates a chat from a listing, it will show up here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversationThreads}
              keyExtractor={(item) => item.partnerId}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.inboxItemCard}
                  onPress={() => handleOpenConversation(item)}
                >
                  <View style={styles.inboxAvatar}>
                    <Text style={styles.inboxAvatarText}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.feedHeader}>
                      <Text style={styles.inboxPartnerName}>{item.name}</Text>
                      <Text style={styles.inboxTime}>
                        {new Date(item.lastDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.inboxRouteTag}>{item.route}</Text>
                    <Text style={styles.inboxLastMsg} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Direct In-App Chat Modal */}
      <Modal visible={showChatModal} animationType="slide">
        <SafeAreaView style={[styles.container, { flex: 1 }]}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)} style={styles.chatBackBtn}>
              <Text style={styles.chatBackBtnText}>◀ Back</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.chatHeaderTitle}>{chatPartner?.name || 'Chat'}</Text>
              <Text style={styles.chatHeaderSub}>{chatPartner?.route || 'Carrier Partner'}</Text>
            </View>
            <View style={{ width: 45 }} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
            contentContainerStyle={styles.chatStreamList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View
                  style={[
                    styles.chatBubble,
                    isMine ? styles.chatBubbleMine : styles.chatBubblePartner,
                  ]}
                >
                  <Text style={styles.chatMessageText}>{item.text}</Text>
                  <Text style={styles.chatTimeText}>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Type a message..."
                placeholderTextColor="#8E8E93"
                value={newMessageText}
                onChangeText={setNewMessageText}
                multiline
              />
              <TouchableOpacity style={styles.sendMsgBtn} onPress={handleSendMessage}>
                <Text style={styles.sendMsgBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Automated Live Map Tracking Screen Modal */}
      <Modal visible={showLiveTrackingModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0F1D' }}>
          <View style={styles.trackingHeader}>
            <Text style={styles.trackingTitle}>📡 Live Package Tracking</Text>
            <Text style={styles.trackingSub}>
              {role === 'traveler'
                ? 'Streaming live location to sender...'
                : 'Tracking traveler position live'}
            </Text>
            <TouchableOpacity onPress={() => setShowLiveTrackingModal(false)} style={{ padding: 6 }}>
              <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>Close Map</Text>
            </TouchableOpacity>
          </View>

          <MapView
            style={{ flex: 1 }}
            region={{
              latitude: mapLatitude,
              longitude: mapLongitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: mapLatitude,
                longitude: mapLongitude,
              }}
              title="Package Location"
              description={`Carrier: ${activeUserListing?.name || 'Traveler'}`}
            />
          </MapView>

          <View style={styles.trackingFooter}>
            {role === 'traveler' ? (
              <TouchableOpacity
                style={styles.completeDeliveryBtn}
                onPress={() => activeUserListing && handleUpdateListingStatus(activeUserListing.id, 'completed')}
              >
                <Text style={styles.completeDeliveryBtnText}>✅ Mark Package Delivered (Stop Tracking)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.senderStatusText}>
                🟢 Package In Transit. GPS coordinates update automatically as the traveler moves.
              </Text>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings & Account</Text>

            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>Logged in as: {userGreetingName}</Text>
              <Text style={[styles.userBadgeText, { fontSize: 11, color: '#94A3B8' }]}>{user.email}</Text>
              {user.user_metadata?.id_verified && (
                <Text
                  style={{
                    color: '#10B981',
                    fontSize: 11,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  ✅ Passport & Face ID Verified
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.settingsRowBtn} onPress={openPrivacyPolicy}>
              <Text style={styles.settingsRowText}>📄 View Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsRowBtn, { backgroundColor: '#334155' }]}
              onPress={handleSignOut}
            >
              <Text style={styles.settingsRowText}>🚪 Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsRowBtn, styles.deleteBtn]}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete Account & Data</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShowSettingsModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <ScrollView style={{ marginVertical: 12 }}>
              <Text style={styles.privacyBody}>
                At CarrySpace, we respect your privacy and are committed to protecting your personal information.
                {'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>1. Information We Collect:{'\n'}</Text>
                CarrySpace collects personal details provided directly by users, including Full Name, Email Address,
                Phone Number, Photo, Address, and ID / Passport details, along with delivery route specifics for luggage
                matching purposes.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>2. How We Use Information:{'\n'}</Text>
                Your information is used exclusively to connect package senders with travelers and verify account
                authenticity. We do not sell your personal data to third parties.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
                  3. Limitation of Liability & Disclaimers:{'\n'}
                </Text>
                CarrySpace, its owners, and developers act solely as a passive venue connecting users. CarrySpace is
                strictly NOT responsible or liable for any lost, stolen, damaged, or delayed items or packages arranged
                through the platform. Furthermore, CarrySpace, its owners, and developers are NOT responsible or liable
                for any payment of additional customs duties, import taxes, penalties, or border inspections. Users are
                solely responsible for declaring goods and complying with all local and international customs laws.
                {'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
                  4. Data Retention & Account Deletion:{'\n'}
                </Text>
                You may request account deletion at any time directly through the Settings menu. Requesting account
                deletion revokes active login access and strips personal identity details from listings. Anonymized record
                logs are retained internally for audit, fraud prevention, and legal compliance purposes.{'\n\n'}
                <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>5. Security & Contact:{'\n'}</Text>
                We use industry-standard encryption protocols (via Supabase) to protect all submitted listings and
                personal data. For privacy inquiries, contact us at{' '}
                <Text style={{ color: '#F59E0B' }}>support.carryspace@gmail.com</Text>.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={closePrivacyPolicy}>
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
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  authScrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  authContainer: { width: '88%', backgroundColor: '#1E293B', padding: 24, borderRadius: 16 },
  authLogo: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  authSubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20, marginTop: 4 },
  verificationSection: {
    marginVertical: 12,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  verificationTitle: { color: '#F59E0B', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  verificationSub: { color: '#94A3B8', fontSize: 11, marginBottom: 12 },
  uploadBox: {
    flex: 1,
    height: 80,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  uploadBoxDone: { borderColor: '#10B981', borderStyle: 'solid' },
  uploadIcon: { fontSize: 22 },
  uploadLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4, textAlign: 'center', paddingHorizontal: 2 },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  verifyingOverlayBox: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  verifyingOverlayText: { color: '#F59E0B', fontWeight: 'bold', fontSize: 14, marginTop: 8 },
  verifyingSubText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  userGreeting: { color: '#F59E0B', fontWeight: 'bold', fontSize: 13, flex: 1 },
  logoContainer: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  logoAccent: { color: '#F59E0B' },
  headerRightActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  inboxHeaderButton: { marginRight: 12, position: 'relative', padding: 4 },
  inboxIcon: { fontSize: 21 },
  inboxBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  inboxBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  settingsButton: { alignItems: 'flex-end', justifyContent: 'center', padding: 4 },
  settingsIcon: { fontSize: 21 },
  toggleContainer: { flexDirection: 'row', margin: 16, backgroundColor: '#1E293B', borderRadius: 12, padding: 4 },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeToggle: { backgroundColor: '#2563EB' },
  toggleText: { color: '#94A3B8', fontWeight: '600' },
  activeToggleText: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 24 },
  cardTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, color: '#FFFFFF', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  datePickerButton: { justifyContent: 'center' },
  goodsSelectorButton: { justifyContent: 'center' },
  submitButton: { backgroundColor: '#F59E0B', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  feedCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  feedWeight: { color: '#F59E0B' },
  feedPrice: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  feedRoute: { color: '#94A3B8', fontSize: 14, marginVertical: 2 },
  feedDesc: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  feedCatTag: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginVertical: 2 },
  feedDate: { color: '#64748B', fontSize: 12, marginBottom: 12 },
  contactButton: { backgroundColor: '#2563EB', padding: 10, borderRadius: 8, alignItems: 'center' },
  contactButtonText: { color: '#FFFFFF', fontWeight: '600' },
  emptyInboxBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyInboxIcon: { fontSize: 48, marginBottom: 12 },
  emptyInboxTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptyInboxSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  inboxItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inboxAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inboxAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  inboxPartnerName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  inboxTime: { color: '#94A3B8', fontSize: 11 },
  inboxRouteTag: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 2 },
  inboxLastMsg: { color: '#CBD5E1', fontSize: 13, marginTop: 4 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  chatBackBtn: { paddingVertical: 6, paddingRight: 10 },
  chatBackBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 14 },
  chatHeaderTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  chatHeaderSub: { color: '#94A3B8', fontSize: 11 },
  chatStreamList: { padding: 16 },
  chatBubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 10 },
  chatBubbleMine: { backgroundColor: '#2563EB', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  chatBubblePartner: { backgroundColor: '#1E293B', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  chatMessageText: { color: '#FFFFFF', fontSize: 14 },
  chatTimeText: { color: '#CBD5E1', fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendMsgBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendMsgBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
  },
  trackingTitle: { color: '#F59E0B', fontWeight: 'bold', fontSize: 16 },
  trackingSub: { color: '#94A3B8', fontSize: 11 },
  trackingFooter: { padding: 16, backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155' },
  completeDeliveryBtn: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center' },
  completeDeliveryBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  senderStatusText: { color: '#10B981', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  modalContentCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    width: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryTitle: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryOptionSelected: { borderColor: '#F59E0B', backgroundColor: '#1E293B' },
  categoryOptionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  categoryDescText: { color: '#10B981', fontSize: 11, fontWeight: 'bold' },
  earnMoreBanner: { marginVertical: 6, paddingHorizontal: 2 },
  earnMoreBannerText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },
  priceEstimateBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  priceEstimateText: { color: '#FFFFFF', fontSize: 13 },
  confirmModalButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmModalButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  datePickerModalCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  datePickerWrapper: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginVertical: 12,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  confirmDateButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmDateButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  bottomStatusSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  searchingContainer: { marginBottom: 12 },
  bufferingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bufferingText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  matchCard: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  matchTitle: { color: '#F59E0B', fontSize: 13, fontWeight: 'bold' },
  matchDetails: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  bottomSheetSectionTitle: { color: '#F59E0B', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  emptySheetText: { color: '#64748B', fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  innerCard: { backgroundColor: '#0F172A', borderRadius: 10, padding: 10, marginBottom: 8 },
  innerCardText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  innerCardSubText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  statusToggleBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statusToggleBtnActiveCompleted: { backgroundColor: '#10B981' },
  statusToggleText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, width: '85%' },
  modalTitle: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  callBtn: { backgroundColor: '#10B981' },
  emailBtn: { backgroundColor: '#2563EB' },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  closeButton: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  settingsRowBtn: { backgroundColor: '#0F172A', padding: 14, borderRadius: 10, marginBottom: 12 },
  settingsRowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#451A1A', borderWidth: 1, borderColor: '#EF4444' },
  deleteBtnText: { color: '#EF4444', fontSize: 15, fontWeight: 'bold' },
  privacyBody: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  userBadge: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userBadgeText: { color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },
  authToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 16,
    padding: 4,
  },
  authTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  authTabActive: { backgroundColor: '#2563EB' },
  authTabText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});