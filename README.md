# XML Form Renderer - Dynamic Form Generation Mobile App

## 📱 Project Overview

The XML Form Renderer is a React Native mobile application that allows dynamic form generation directly from XML input. This app enables users to render complex forms with various field types, providing a flexible and extensible form rendering solution.

![React Native](https://img.shields.io/badge/React%20Native-0.69-blue)
![Expo](https://img.shields.io/badge/Expo-~46.0.0-blue)
![Formik](https://img.shields.io/badge/Formik-2.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 🔄 Dynamic form rendering from XML
- 📝 Support for multiple field types:
  - Text fields
  - Date/time fields
  - Radio buttons
  - Drawing/signature capture
- 🛡️ Robust form validation
- 🚀 Cross-platform compatibility (iOS & Android)
- 📤 Custom XML input support

## 🚀 Getting Started

### Prerequisites

- Node.js (14.0.0+)
- npm or Yarn
- Expo CLI
- React Native development environment

### Installation

1. Clone the repository
```bash
git clone https://github.com/AsrithTanniru/XMLForm-renderer.git
cd XMLForm-renderer
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Start the development server
```bash
expo start
```

## 💡 Usage Examples

### Predefined XML Form

```xml
<form>
  <field id="name" type="text" label="Full Name" required="true" />
  <field id="dob" type="datetime" label="Date of Birth" required="true" />
  <field id="gender" type="radio" label="Gender" required="true">
    <option value="male">Male</option>
    <option value="female">Female</option>
  </field>
</form>
```

### Custom XML Input

The app allows users to input their own XML, providing ultimate flexibility in form design.

## 🧪 Testing

- Comprehensive form validation
- Multiple field type support
- Error handling mechanisms
- Cross-platform compatibility testing

## 📦 Dependencies

- React Native
- Expo
- Formik
- Yup
- react-native-xml2js
- react-native-canvas
