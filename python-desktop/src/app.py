"""
Application - PyQt6 application setup with dark theme.
"""

import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QPalette, QColor
from PyQt6.QtCore import Qt

from .ui.main_window import MainWindow


def create_dark_palette() -> QPalette:
    """Create a dark color palette."""
    palette = QPalette()

    # Window colors
    palette.setColor(QPalette.ColorRole.Window, QColor(18, 18, 18))
    palette.setColor(QPalette.ColorRole.WindowText, QColor(255, 255, 255))

    # Base colors (for text editors, lists, etc.)
    palette.setColor(QPalette.ColorRole.Base, QColor(26, 26, 26))
    palette.setColor(QPalette.ColorRole.AlternateBase, QColor(38, 38, 38))

    # Text colors
    palette.setColor(QPalette.ColorRole.Text, QColor(255, 255, 255))
    palette.setColor(QPalette.ColorRole.PlaceholderText, QColor(128, 128, 128))

    # Button colors
    palette.setColor(QPalette.ColorRole.Button, QColor(55, 65, 81))
    palette.setColor(QPalette.ColorRole.ButtonText, QColor(255, 255, 255))
    palette.setColor(QPalette.ColorRole.BrightText, QColor(255, 255, 255))

    # Highlight colors
    palette.setColor(QPalette.ColorRole.Highlight, QColor(59, 130, 246))
    palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))

    # Link colors
    palette.setColor(QPalette.ColorRole.Link, QColor(59, 130, 246))
    palette.setColor(QPalette.ColorRole.LinkVisited, QColor(147, 112, 219))

    # Tooltip
    palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(38, 38, 38))
    palette.setColor(QPalette.ColorRole.ToolTipText, QColor(255, 255, 255))

    # Disabled colors
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.WindowText, QColor(128, 128, 128))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.Text, QColor(128, 128, 128))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.ButtonText, QColor(128, 128, 128))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.Highlight, QColor(80, 80, 80))
    palette.setColor(QPalette.ColorGroup.Disabled, QPalette.ColorRole.HighlightedText, QColor(128, 128, 128))

    return palette


DARK_STYLESHEET = """
QMainWindow {
    background-color: #121212;
}

QWidget {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

QMenuBar {
    background-color: #1f1f1f;
    color: white;
    border-bottom: 1px solid #333;
    padding: 4px 8px;
}

QMenuBar::item {
    padding: 6px 12px;
    border-radius: 4px;
}

QMenuBar::item:selected {
    background-color: #3b82f6;
}

QMenu {
    background-color: #262626;
    color: white;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 4px;
}

QMenu::item {
    padding: 8px 24px;
    border-radius: 4px;
}

QMenu::item:selected {
    background-color: #3b82f6;
}

QMenu::separator {
    height: 1px;
    background: #333;
    margin: 4px 8px;
}

QPushButton {
    background-color: #374151;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-weight: 500;
}

QPushButton:hover {
    background-color: #4b5563;
}

QPushButton:pressed {
    background-color: #1f2937;
}

QPushButton:disabled {
    background-color: #1f2937;
    color: #666;
}

QComboBox {
    background-color: #374151;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    min-width: 100px;
}

QComboBox::drop-down {
    border: none;
    width: 20px;
}

QComboBox::down-arrow {
    width: 12px;
    height: 12px;
}

QComboBox QAbstractItemView {
    background-color: #374151;
    color: white;
    selection-background-color: #3b82f6;
    border: 1px solid #4b5563;
    border-radius: 6px;
}

QCheckBox {
    color: #ccc;
    spacing: 8px;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #4b5563;
    background-color: transparent;
}

QCheckBox::indicator:checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
}

QCheckBox::indicator:hover {
    border-color: #3b82f6;
}

QSlider::groove:horizontal {
    height: 6px;
    background: #374151;
    border-radius: 3px;
}

QSlider::handle:horizontal {
    background: #3b82f6;
    width: 16px;
    height: 16px;
    margin: -5px 0;
    border-radius: 8px;
}

QSlider::sub-page:horizontal {
    background: #3b82f6;
    border-radius: 3px;
}

QProgressBar {
    background: #374151;
    border: none;
    border-radius: 4px;
    height: 8px;
    text-align: center;
}

QProgressBar::chunk {
    background: #3b82f6;
    border-radius: 4px;
}

QScrollBar:vertical {
    background: #1f1f1f;
    width: 12px;
    border-radius: 6px;
}

QScrollBar::handle:vertical {
    background: #4b5563;
    border-radius: 6px;
    min-height: 30px;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0;
}

QScrollBar:horizontal {
    background: #1f1f1f;
    height: 12px;
    border-radius: 6px;
}

QScrollBar::handle:horizontal {
    background: #4b5563;
    border-radius: 6px;
    min-width: 30px;
}

QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0;
}

QMessageBox {
    background-color: #262626;
}

QMessageBox QLabel {
    color: white;
}

QDialog {
    background-color: #1a1a1a;
}

QSplitter::handle {
    background: #333;
}

QSplitter::handle:horizontal {
    width: 4px;
}

QSplitter::handle:vertical {
    height: 4px;
}

QToolTip {
    background-color: #262626;
    color: white;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 4px 8px;
}

QLabel {
    color: white;
}
"""


class DanceTrainingApp:
    """Main application class."""

    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("AI Dance Training")
        self.app.setStyle("Fusion")

        # Apply dark theme
        self.app.setPalette(create_dark_palette())
        self.app.setStyleSheet(DARK_STYLESHEET)

        # Create main window
        self.window = MainWindow()

    def run(self) -> int:
        """Run the application."""
        self.window.show()
        return self.app.exec()


def main():
    """Entry point."""
    app = DanceTrainingApp()
    sys.exit(app.run())


if __name__ == "__main__":
    main()
