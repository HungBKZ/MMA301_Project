import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";

// 🗄️ Import database (tự động tạo DB khi app khởi động)
import "./src/database/db";

// 📱 Import screens
// Màn hình CHUNG/ADMIN
import HomeScreen from "./src/screens/HomeScreen";
import AddMovieScreen from "./src/screens/AddMovieScreen";
import MovieDetailScreen from "./src/screens/MovieDetailScreen";
import SearchScreen from "./src/screens/SearchScreen";
import CategoryReportScreen from "./src/screens/CategoryReportScreen";
import FavoriteYearsReportScreen from "./src/screens/FavoriteYearsReportScreen";
import DataManagementScreen from "./src/screens/DataManagementScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import AddItemScreen from "./src/screens/AddItemScreen";
import WishlistSummaryScreen from "./src/screens/WishlistSummaryScreen";

// Màn hình AUTH
import LoginScreen from "./src/screens/authScreens/LoginScreen";
import RegisterScreen from "./src/screens/authScreens/RegisterScreen";

// Màn hình USER
import UserHomeScreen from "./src/screens/userScreens/UserHomeScreen";

// 🎨 Import colors
import { colors } from "./src/styles/commonStyles";

// 🔧 Tạo navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Cấu hình chung cho Header
const defaultHeaderOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "bold" },
};

/** Auth stack */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Đăng nhập", headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Đăng ký tài khoản" }}
      />
    </Stack.Navigator>
  );
}

/** User stack */
function UserStack() {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
      <Stack.Screen
        name="UserHome"
        component={UserHomeScreen}
        options={{ title: "My Watched List" }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: "Add New Item" }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistSummaryScreen}
        options={{ title: "My Wishlist" }}
      />
    </Stack.Navigator>
  );
}

/** Home stack (admin) */
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
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

/** Reports stack (admin) */
function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={defaultHeaderOptions}>
/**
 * � Search Stack Navigator
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

/** Admin tab navigator */
function AdminTabNavigator() {
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
            case "User":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: "Movies" }} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search", headerShown: true }}
      />
      <Tab.Screen name="Reports" component={ReportsStack} options={{ title: "Reports" }} />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Dashboard", headerShown: true }}
      />
      <Tab.Screen
        name="Data"
        component={DataManagementScreen}
        options={{ title: "Data", headerShown: true }}
      />
      {/* Thêm tab User */}
      <Tab.Screen
        name="User"
        component={UserHomeScreen}
        options={{ title: "User Info", headerShown: true }}
      />
    </Tab.Navigator>
    <NavigationContainer>
      <StatusBar style="dark" />

      {/* 🧭 Bottom Tab Navigation */}
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
      </Tab.Navigator>
    </NavigationContainer>
  );
}

/** Main App logic: điều hướng theo trạng thái đăng nhập và role */
function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, alignSelf: "center" }} />
    );
  }
  if (!user) return <AuthStack />;

  if (user.role === "admin") return <AdminTabNavigator />;
  return <UserStack />;
}

/** App component: bọc AuthProvider và NavigationContainer */
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <MainApp />
      </NavigationContainer>
    </AuthProvider>
  );
}