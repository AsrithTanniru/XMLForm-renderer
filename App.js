import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import Canvas from 'react-native-canvas';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { parseString } from 'react-native-xml2js';
import DrawingModal from './DrawingModal';

/**
 * @constant {string} DEFAULT_XML_DATA
 * @description Default XML template for the form.
 * Provides a structured example of supported field types:
 * - `text`: A single-line text input field for general text.
 * - `datetime`: A text input field intended for date and/or time input.
 * - `radio`: A group of radio buttons allowing single selection from multiple options.
 * - `drawing`: A dedicated area for capturing a freehand drawing or signature.
 */
const DEFAULT_XML_DATA = `
<form>
  <field id="name" type="text" label="Full Name" required="true" />
  <field id="dob" type="datetime" label="Date of Birth" required="true" />
  <field id="gender" type="radio" label="Gender" required="true">
    <option value="male">Male</option>
    <option value="female">Female</option>
    <option value="other">Other</option>
  </field>
  <field id="signature" type="drawing" label="Signature" required="true" />
</form>
`;

/**
 * @component XMLFormRenderer
 * @description Main component for rendering dynamic forms based on XML definitions.
 *
 * @primaryResponsibility Manage the overall form rendering process, including:
 * 1. Handling different form input modes (loading from a default XML or providing custom XML).
 * 2. Parsing the provided XML string into a structured JavaScript object.
 * 3. Dynamically generating form fields based on the parsed XML structure.
 * 4. Implementing form submission logic and basic field validation using Formik and Yup.
 * 5. Providing a modal interface for displaying the dynamically generated form.
 *
 * @state {boolean} modalVisible - Controls the visibility of the modal that contains the dynamic form.
 * @state {string|null} formMode - Indicates the current mode of form rendering ('file' for default XML, 'custom' for user-provided XML, or null initially).
 * @state {Array<Object>} parsedFields - Stores the array of field objects extracted from the parsed XML. Each object represents a form field with its attributes (id, type, label, etc.).
 * @state {string|null} formError - Stores any error message that occurs during XML parsing or form rendering.
 * @state {string} customXML - Holds the XML string entered by the user in the custom XML input.
 * @state {boolean} drawingModalVisible - Controls the visibility of the `DrawingModal` component for capturing signatures.
 * @state {string|null} currentDrawingField - Stores the `id` of the drawing field that triggered the `DrawingModal`.
 * @state {function|null} formikSetFieldValue - Stores the `setFieldValue` function provided by Formik, allowing programmatic updates to form values from child components like `DrawingModal`.
 * @state {boolean} signatureSaved - A flag to indicate whether a signature has been successfully saved for the current drawing field.
 *
 * @uses react
 * @uses react-native
 * @uses react-native-canvas
 * @uses expo-image-picker
 * @uses expo-document-picker
 * @uses formik
 * @uses yup
 * @uses react-native-xml2js
 * @uses ./DrawingModal
 */
export default function XMLFormRenderer() {
  // State management for various form and modal interactions
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [parsedFields, setParsedFields] = useState([]);
  const [formError, setFormError] = useState(null);
  const [customXML, setCustomXML] = useState('');
  const [drawingModalVisible, setDrawingModalVisible] = useState(false);
  const [currentDrawingField, setCurrentDrawingField] = useState(null);
  const [formikSetFieldValue, setFormikSetFieldValue] = useState(null);
  const [signatureSaved, setSignatureSaved] = useState(false);

  /**
   * @function parseXML
   * @description Parses the provided XML input string and validates its structure.
   * It uses the `react-native-xml2js` library to convert the XML into a JavaScript object.
   *
   * @param {string} xmlInput - The XML string to be parsed.
   *
   * @validationChecks
   * - Ensures the XML input is not empty.
   * - Validates that the XML string is well-formed and can be parsed.
   * - Checks if all `<field>` elements have a supported `type` attribute (text, datetime, radio, drawing).
   *
   * @stateUpdate
   * - If validation fails, it updates the `formError` state with an appropriate error message.
   * - If parsing and validation are successful, it updates the `parsedFields` state with an array of field objects extracted from the XML and sets `modalVisible` to true to display the form.
   */
  const parseXML = (xmlInput) => {
    setFormError(null);

    // Checking for empty input
    if (!xmlInput || xmlInput.trim() === '') {
      setFormError("XML input cannot be empty");
      return;
    }

    // Parsing XML using react-native-xml2js
    parseString(xmlInput, (err, result) => {
      // Handling parsing errors
      if (err) {
        setFormError("Invalid XML format");
        return;
      }

      // Extracting fields from parsed XML. Accessing the 'field' property within the 'form' element.
      const fields = result?.form?.field || [];

      // Validating field types
      const validFieldTypes = ['text', 'datetime', 'radio', 'drawing'];
      const invalidFields = fields.filter(field =>
        !validFieldTypes.includes(field.$.type)
      );

      // Rejecting if any invalid field types are found
      if (invalidFields.length > 0) {
        setFormError(`Invalid field types: <span class="math-inline">\{invalidFields\.map\(f \=\> f\.</span>.type).join(', ')}`);
        return;
      }

      setParsedFields(fields);
      setModalVisible(true);
    });
  };

  /**
   * @function renderFormModal
   * @description Renders the modal component that displays the dynamic form.
   * It handles different scenarios based on whether the form is loaded from a file or custom input.
   * It uses the `Formik` component to manage form state, validation, and submission.
   *
   * @returns {JSX.Element} The Modal component containing the dynamic form.
   */
  const renderFormModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={() => {
        setModalVisible(false);
        setParsedFields([]);
        setFormMode(null);
        setCustomXML('');
        setFormError(null);
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView>
          <Text style={styles.modalTitle}>
            {formMode === 'file' ? 'XML File Form' : 'Custom XML Form'}
          </Text>

          {formMode === 'custom' && (
            <View style={styles.xmlInputContainer}>
              <TextInput
                style={styles.xmlInput}
                placeholder="Enter XML here..."
                multiline
                value={customXML}
                onChangeText={setCustomXML}
              />
              <TouchableOpacity
                style={styles.parseButton}
                onPress={() => parseXML(customXML)}
              >
                <Text style={styles.parseButtonText}>Parse Custom XML</Text>
              </TouchableOpacity>
            </View>
          )}

          {formError && (
            <Text style={styles.errorText}>{formError}</Text>
          )}

          {parsedFields.length > 0 && (
            <Formik
              /**
               * @prop {Object} initialValues
               * @description Dynamically creates the initial values for the Formik form based on the parsed XML fields.
               * Each field's `id` from the XML becomes a key in the `initialValues` object with an empty string as its initial value.
               */
              initialValues={parsedFields.reduce((acc, field) => {
                acc[field.$.id] = '';
                return acc;
              }, {})}
              /**
               * @prop {Yup.ObjectSchema} validationSchema
               * @description Dynamically creates the Yup validation schema based on the parsed XML fields and their `required` and `type` attributes.
               * For each required field, it adds a corresponding validation rule to the schema based on the field type (e.g., `Yup.string().required()` for text, `Yup.date().required()` for datetime).
               */
              validationSchema={Yup.object().shape(
                parsedFields.reduce((schema, field) => {
                  if (field.$.required === "true") {
                    switch (field.$.type) {
                      case 'text':
                        schema[field.$.id] = Yup.string().required(`<span class="math-inline">\{field\.</span>.label} is required`);
                        break;
                      case 'datetime':
                        schema[field.$.id] = Yup.date().required(`<span class="math-inline">\{field\.</span>.label} is required`);
                        break;
                      case 'radio':
                        schema[field.$.id] = Yup.string().required(`<span class="math-inline">\{field\.</span>.label} is required`);
                        break;
                      case 'drawing':
                        schema[field.$.id] = Yup.string().required(`<span class="math-inline">\{field\.</span>.label} is required`);
                        break;
                      default:
                        break;
                    }
                  }
                  return schema;
                }, {})
              )}
              /**
               * @prop {function} onSubmit
               * @description Handles the form submission. It displays an alert with the form values and then resets the form and closes the modal.
               * @param {Object} values - The current values of the form fields.
               * @param {Object} actions - Formik action helpers (e.g., `resetForm`).
               */
              onSubmit={(values, { resetForm }) => {
                Alert.alert("Form Submitted", JSON.stringify(values));
                resetForm();
                setModalVisible(false);
                setSignatureSaved(false); // Reset signature saved state on submission
              }}
            >
              {({
                handleChange,
                handleSubmit,
                setFieldValue,
                values,
                errors,
                touched
              }) => {
                // Storing setFieldValue in state when component renders.
                // This allows the DrawingModal to update the Formik form values.
                useEffect(() => {
                  setFormikSetFieldValue(() => setFieldValue);
                }, [setFieldValue]);

                return (
                  <View>
                  {parsedFields.map((field) => {
                    switch (field.$.type) {
                      case "text":
                        return (
                          <View key={field.$.id} style={styles.fieldContainer}>
                            <Text style={styles.label}>{field.$.label}</Text>
                            <TextInput
                              style={styles.input}
                              onChangeText={handleChange(field.$.id)}
                              value={values[field.$.id]}
                            />
                            {touched[field.$.id] && errors[field.$.id] && (
                              <Text style={styles.errorText}>{errors[field.$.id]}</Text>
                            )}
                          </View>
                        );
                        case "datetime":
                          return (
                            <View key={field.$.id} style={styles.fieldContainer}>
                              <Text style={styles.label}>{field.$.label}</Text>
                              <TextInput
                                style={styles.input}
                                placeholder="Enter Date (YYYY-MM-DD)"
                                onChangeText={handleChange(field.$.id)}
                                value={values[field.$.id]}
                                keyboardType="default"
                              />
                              {touched[field.$.id] && errors[field.$.id] && (
                                <Text style={styles.errorText}>{errors[field.$.id]}</Text>
                              )}
                            </View>
                          );
                      case "radio":
                        return (
                          <View key={field.$.id} style={styles.fieldContainer}>
                            <Text style={styles.label}>{field.$.label}</Text>
                            <View style={styles.radioContainer}>
                              {field.option.map((option, index) => (
                                <TouchableOpacity 
                                  key={index} 
                                  style={[
                                    styles.radioOption, 
                                    values[field.$.id] === option.$.value && styles.selectedRadioOption
                                  ]}
                                  onPress={() => setFieldValue(field.$.id, option.$.value)}
                                >
                                  <View style={styles.radioCircle}>
                                    {values[field.$.id] === option.$.value && (
                                      <View style={styles.selectedRadioCircle} />
                                    )}
                                  </View>
                                  <Text style={styles.radioText}>{option._}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            {touched[field.$.id] && errors[field.$.id] && (
                              <Text style={styles.errorText}>{errors[field.$.id]}</Text>
                            )}
                          </View>
                        );
                        case "drawing":
                          return (
                            <View key={field.$.id} style={styles.fieldContainer}>
                              <Text style={styles.label}>{field.$.label}</Text>
                              <TouchableOpacity
                                style={styles.drawingButton}
                                onPress={() => {
                                  setDrawingModalVisible(true);
                                  setCurrentDrawingField(field.$.id);
                                }}
                              >
                                <Text style={styles.drawingButtonText}>
                                  {signatureSaved ? "Signature Saved!" : "Open Drawing Canvas"}
                                </Text>
                              </TouchableOpacity>
                              {signatureSaved && (
                                <Text style={styles.successText}>Signature saved successfully!</Text>
                              )}
                            </View>
                          );

                      default:
                        return null;
                    }
                  })}
                  
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              )}}
            </Formik>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setModalVisible(false);
              // Reset form-related states
              setParsedFields([]);
              setFormMode(null);
              setCustomXML('');
              setFormError(null);
            }}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>

        <DrawingModal
  visible={drawingModalVisible}
  onClose={() => {
    setDrawingModalVisible(false);
    setCurrentDrawingField(null);
  }}
  onSave={(dataURL) => {
    if (formikSetFieldValue && currentDrawingField) {
      formikSetFieldValue(currentDrawingField, dataURL);
      setSignatureSaved(true);
    }
    setDrawingModalVisible(false);
    setCurrentDrawingField(null);
  }}
/>

      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>XML Form Renderer</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          parseXML(DEFAULT_XML_DATA);
          setFormMode('file');
        }}
      >
        <Text style={styles.buttonText}>Render Form from XML File</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setFormMode('custom');
          setModalVisible(true);
          setParsedFields([]);
        }}
      >
        <Text style={styles.buttonText}>Render Form from XML Input</Text>
      </TouchableOpacity>

      {renderFormModal()}
    </View>
  );
}

//styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333'
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginVertical: 10
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    padding: 20
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  xmlInputContainer: {
    marginBottom: 20
  },
  xmlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    height: 150,
    marginBottom: 10
  },
  parseButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  parseButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  fieldContainer: {
    marginVertical: 10
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10
  },
  radioOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 5
  },
  imagePickerButton: {
    backgroundColor: '#17a2b8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  imagePickerText: {
    color: 'white',
    fontWeight: 'bold'
  },
  image: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 10
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center'
  },
  drawingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  canvas: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5
  },
  drawingButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20
  },
  drawingButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,

    width: '30%',
    alignItems: 'center'
  },
  drawingButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  radioContainer: {
    flexDirection: 'column',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 5,
  },
  selectedRadioOption: {
    backgroundColor: '#e6f2ff',
  },
  radioCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedRadioCircle: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#007bff',
  },
  radioText: {
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    padding: 10,
  },

});