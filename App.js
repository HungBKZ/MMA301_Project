// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

// 🗄️ Import database (tự động tạo DB khi app khởi động)
import "./src/database/db";

// 📱 Import screens
import HomeScreen from "./src/screens/HomeScreen";
import AddMovieScreen from "./src/screens/AddMovieScreen";
import MovieDetailScreen from "./src/screens/MovieDetailScreen";
import SearchScreen from "./src/screens/SearchScreen";
import CategoryReportScreen from "./src/screens/CategoryReportScreen";
import FavoriteYearsReportScreen from "./src/screens/FavoriteYearsReportScreen";
import DataManagementScreen from "./src/screens/DataManagementScreen";
import DashboardScreen from "./src/screens/DashboardScreen";

// 🎨 Import colors
import { colors } from "./src/styles/commonStyles";

// 🔧 Tạo navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * 🏠 Home Stack Navigator
 * Bao gồm: Home, AddMovie, MovieDetail
 */
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: "Movie Manager",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
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
 * 📊 Reports Stack Navigator
 * Gồm: Category Report + Favorite Years Report
 */
function ReportsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
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
 * 🌎 Main App Component
 */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />

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
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ title: "Movies" }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: "Search",
            headerShown: true,
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
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
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        />
        <Tab.Screen
          name="Data"
          component={DataManagementScreen}
          options={{
            title: "Data",
            headerShown: true,
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
