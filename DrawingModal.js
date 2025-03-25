import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  PanResponder,
  StyleSheet,
  Alert
} from 'react-native';
import Canvas from 'react-native-canvas';

/**
 * DrawingModal - A dedicated component for capturing user drawings/signatures
 * 
 * Key Features:
 * - Full-screen drawing canvas
 * - Real-time drawing tracking
 * - Clear and save functionality
 * - Touch-based drawing interaction
 */
const DrawingModal = ({ visible, onClose, onSave }) => {
  // Refs and state for managing drawing functionality
  const canvasRef = useRef(null);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  /**
   * PanResponder for tracking touch interactions
   * 
   * Manages:
   * - Starting a new drawing path
   * - Tracking path movement
   * - Completing drawing paths
   */
  const panResponder = useRef(
    PanResponder.create({
      // Allow touch interactions
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      /**
       * Initializing drawing path when touch begins
       * @param {Object} evt - Touch event details
       */
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath({ 
          points: [{ x: locationX, y: locationY }],
          color: 'black',
          width: 2
        });
      },

      /**
       * Updating current drawing path as finger moves
       * @param {Object} evt - Touch move event details
       */
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(current => ({
          ...current,
          points: [...current.points, { x: locationX, y: locationY }]
        }));
      },

      /**
       * Finalize drawing path when touch ends
       */
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths(prev => [...prev, currentPath]);
          setCurrentPath(null);
        }
      }
    })
  ).current;


  useEffect(() => {
    const drawPaths = async () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw all stored paths
        paths.forEach(path => {
          ctx.beginPath();
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          path.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          
          ctx.stroke();
        });

        // Drawing current path if drawing
        if (currentPath) {
          ctx.beginPath();
          ctx.strokeStyle = currentPath.color;
          ctx.lineWidth = currentPath.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          currentPath.points.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          
          ctx.stroke();
        }
      }
    };

    drawPaths();
  }, [paths, currentPath]);

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath(null);
  };

  const saveDrawing = async () => {
    if (canvasRef.current) {
      try {
        const dataURL = await canvasRef.current.toDataURL();
        // Call onSave with the dataURL
        onSave(dataURL);
        onClose();
      } catch (error) {
        console.error('Error saving drawing:', error);
        // Optionally showing an alert to the user
        Alert.alert('Error', 'Could not save drawing');
      }
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.drawingModalContainer} {...panResponder.panHandlers}>
        <Canvas
          ref={canvasRef}
          style={styles.canvas}
          width={Dimensions.get('window').width - 40}
          height={300}
        />
        <View style={styles.drawingButtonContainer}>
          <TouchableOpacity 
            style={styles.drawingButton} 
            onPress={clearCanvas}
          >
            <Text style={styles.drawingButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.drawingButton} 
            onPress={saveDrawing}
          >
            <Text style={styles.drawingButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.drawingButton} 
            onPress={onClose}
          >
            <Text style={styles.drawingButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  }
});

export default DrawingModal;