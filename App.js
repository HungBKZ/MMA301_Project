// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

// 🗄️ Import database (tự động tạo DB khi app khởi động)
import "./src/database/db";

// 📱 Import screens - Admin/Common
import HomeScreen from "./src/screens/HomeScreen";
import AddMovieScreen from "./src/screens/AddMovieScreen";
import MovieDetailScreen from "./src/screens/MovieDetailScreen";
import SearchScreen from "./src/screens/SearchScreen";
import CategoryReportScreen from "./src/screens/CategoryReportScreen";
import FavoriteYearsReportScreen from "./src/screens/FavoriteYearsReportScreen";
import DataManagementScreen from "./src/screens/DataManagementScreen";
import DashboardScreen from "./src/screens/DashboardScreen";

// 📱 Import screens - Auth
import LoginScreen from "./src/screens/authScreens/LoginScreen";
import RegisterScreen from "./src/screens/authScreens/RegisterScreen";

// 📱 Import screens - Profile
import ProfileScreen from "./src/screens/ProfileScreen";
<<<<<<< HEAD
import UpdateProfileScreen from "./src/screens/UpdateProfileScreen";
=======
import CollectionsListScreen from "./src/screens/collections/CollectionsListScreen";
import CollectionDetailScreen from "./src/screens/collections/CollectionDetailScreen";
>>>>>>> 0eccd817b5e4cb3137db58a0049bb0855c8d5599

// 📱 Import screens - User
import UserHomeScreen from "./src/screens/userScreens/UserHomeScreen";
import MapsScreen from "./src/screens/userScreens/MapsScreen";

// 🎨 Import colors
import { colors } from "./src/styles/commonStyles";
import WishListScreen from "./src/screens/WishListScreen";

// 🔧 Tạo navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * 🔐 Auth Stack Navigator
 * Màn hình đăng nhập và đăng ký
 */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
<<<<<<< HEAD
          headerStyle: { backgroundColor: colors.surface, elevation: 4 },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: "bold", color: colors.textPrimary },
=======
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.textPrimary,
          },
>>>>>>> 0eccd817b5e4cb3137db58a0049bb0855c8d5599
          title: "Create Account",
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * 🏠 Home Stack Navigator
 * Bao gồm: Home, AddMovie, MovieDetail
 */
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: "Movie Manager",
        }}
      />
      <Stack.Screen
        name="AddMovie"
        component={AddMovieScreen}
        options={{
          title: "Add New Movie",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Detail"
        component={MovieDetailScreen}
        options={{ title: "Movie Details" }}
      />
    </Stack.Navigator>
  );
}

/**
 * Search Stack Navigator
 * Gồm: Search + Movie Detail
 */
function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ title: "Search & Filter" }}
      />
      <Stack.Screen
        name="Detail"
        component={MovieDetailScreen}
        options={{ title: "Movie Details" }}
      />
    </Stack.Navigator>
  );
}

function WishlistStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="WishListMain"
        component={WishListScreen}
        options={{ title: "Wishlist" }}
      />
      <Stack.Screen
        name="Detail"
        component={MovieDetailScreen}
        options={{ title: "Movie Details" }}
      />
    </Stack.Navigator>
  );
}
/**
 * 📁 Collections Stack (User)
 */
function CollectionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="CollectionsList"
        component={CollectionsListScreen}
        options={{ title: "Collections" }}
      />
      <Stack.Screen
        name="CollectionDetail"
        component={CollectionDetailScreen}
        options={{ title: "Collection" }}
      />
    </Stack.Navigator>
  );
}

/**
 * �📊 Reports Stack Navigator
 * Gồm: Category Report + Favorite Years Report
 */
function ReportsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: "bold",
          color: colors.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="CategoryReport"
        component={CategoryReportScreen}
        options={{ title: "Movies by Category" }}
      />
      <Stack.Screen
        name="FavoriteYearsReport"
        component={FavoriteYearsReportScreen}
        options={{ title: "Peak Favorite Years" }}
      />
    </Stack.Navigator>
  );
}

/**
 * � Admin Tab Navigator
 * Tất cả tính năng cho admin
 */
function AdminTabs({ userId, email }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "Reports":
              iconName = focused ? "stats-chart" : "stats-chart-outline";
              break;
            case "Dashboard":
              iconName = focused ? "analytics" : "analytics-outline";
              break;
            case "Data":
              iconName = focused ? "folder-open" : "folder-open-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          elevation: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: "Movies" }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ title: "Search" }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        options={{ title: "Reports" }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
            shadowColor: colors.primary,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.textPrimary,
          },
        }}
      />
      <Tab.Screen
        name="Data"
        component={DataManagementScreen}
        options={{
          title: "Data",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
            shadowColor: colors.primary,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.textPrimary,
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
<<<<<<< HEAD
        initialParams={{ userId, email }}
=======
>>>>>>> 0eccd817b5e4cb3137db58a0049bb0855c8d5599
        options={{
          title: "Profile",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
            shadowColor: colors.primary,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.textPrimary,
          },
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * 👤 User Tab Navigator
 * Tính năng giới hạn cho user
 */
function UserTabs({ userId, email }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Collections":
              iconName = focused ? "albums" : "albums-outline";
              break;
            case "Maps":
              iconName = focused ? "map" : "map-outline";
              break;
            case "Search":
              iconName = focused ? "search" : "search-outline";
              break;
            case "Wishlist":
              iconName = focused ? "heart" : "heart-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;

          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          elevation: 8,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={UserHomeScreen}
        options={{
          title: "Home",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsStack}
        options={{ title: "Collections" }}
      />
      <Tab.Screen
        name="Maps"
        component={MapsScreen}
        options={{
          title: "Maps",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: "bold" },
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{ title: "Search" }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistStack}
        options={{ title: "Wishlist" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId, email }}
        options={{
          title: "Profile",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
            elevation: 4,
            shadowColor: colors.primary,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.textPrimary,
          },
        }}
      />
    </Tab.Navigator>
  );
}

// /**
//  * 🎯 Main App Logic
//  * Điều hướng dựa trên trạng thái đăng nhập
//  */
// function AppNavigator() {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
//         <ActivityIndicator size="large" color={colors.primary} />
//         <Text style={{ marginTop: 16, color: colors.textPrimary }}>Loading...</Text>
//       </View>
//     );
//   }

//   // Chưa đăng nhập -> AuthStack
//   if (!user) {
//     return <AuthStack />;
//   }

//   // Đã đăng nhập -> Admin hoặc User tabs
//   if (user.role === "admin") {
//     return <AdminTabs />;
//   }

//   return <UserTabs />;
// }

// /**
//  * 🌎 Main App Component
//  */
// export default function App() {
//   return (
//     <AuthProvider>
//       <NavigationContainer>
//         <StatusBar style="dark" />
//         <AppNavigator />
//       </NavigationContainer>
//     </AuthProvider>
//   );
// }


/**
 * MainScreen wrapper: App không gọi DB, chỉ lựa tab theo role được truyền khi điều hướng từ screen (Login/Register)
 */
function MainScreen({ route }) {
  const role = route?.params?.role || "user";
  const userId = route?.params?.userId;
  const email = route?.params?.email;

  if (role === "admin") return <AdminTabs userId={userId} email={email} />;
  return <UserTabs userId={userId} email={email} />;
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} options={{ title: "Cập nhật tài khoản" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

