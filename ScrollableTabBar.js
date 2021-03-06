const React = require('react');
const ReactNative = require('react-native');
const {
  View,
  Animated,
  StyleSheet,
  ScrollView,
  Text,
  Platform,
  Dimensions,
  Image
} = ReactNative;
const Button = require('./Button');

const WINDOW_WIDTH = Dimensions.get('window').width;
const MASK_WIDTH = 60;

const MASK_IMG = {
  LEFT: {
    LIGHT: require('./src/mask_left_light.png'),
    DARK: require('./src/mask_left_dark.png'),
    X_LIGHT: require('./src/mask_left_xlight.png')
  },
  RIGHT: {
    LIGHT: require('./src/mask_right_light.png'),
    DARK: require('./src/mask_right_dark.png'),
    X_LIGHT: require('./src/mask_right_xlight.png')
  }
}

const ScrollableTabBar = React.createClass({
  propTypes: {
    goToPage: React.PropTypes.func,
    activeTab: React.PropTypes.number,
    tabs: React.PropTypes.array,
    backgroundColor: React.PropTypes.string,
    activeTextColor: React.PropTypes.string,
    inactiveTextColor: React.PropTypes.string,
    scrollOffset: React.PropTypes.number,
    style: View.propTypes.style,
    tabStyle: View.propTypes.style,
    tabsContainerStyle: View.propTypes.style,
    textStyle: Text.propTypes.style,
    renderTab: React.PropTypes.func,
    underlineStyle: View.propTypes.style,
    underlineContainerStyle: View.propTypes.style,
    onScroll: React.PropTypes.func,
    showMask: React.PropTypes.bool,
    maskMode: React.PropTypes.oneOf(['light', 'dark','x-light'])
  },

  getDefaultProps() {
    return {
      scrollOffset: 52,
      activeTextColor: 'navy',
      inactiveTextColor: 'black',
      backgroundColor: null,
      style: {},
      tabStyle: {},
      tabsContainerStyle: {},
      underlineStyle: {},
      underlineContainerStyle: {},
      showMask: false,
      maskMode: 'x-light'
    };
  },

  getInitialState() {
    this._tabsMeasurements = [];
    switch (this.props.maskMode) {
      case 'light':
        this.maskImageSrc = {left: MASK_IMG.LEFT.LIGHT, right: MASK_IMG.RIGHT.LIGHT};
        break;
      case 'dark':
        this.maskImageSrc = {left: MASK_IMG.LEFT.DARK, right: MASK_IMG.RIGHT.DARK};
        break;
      case 'x-light':
        this.maskImageSrc = {left: MASK_IMG.LEFT.X_LIGHT, right: MASK_IMG.RIGHT.X_LIGHT};
        break;
      default:
        this.maskImageSrc = {left: MASK_IMG.LEFT.X_LIGHT, right: MASK_IMG.RIGHT.X_LIGHT};
    }
    return {
      _leftTabUnderline: new Animated.Value(0),
      _widthTabUnderline: new Animated.Value(0),
      _containerWidth: null,
      _showLeftMask: false,
      _showRightMask: false
    };
  },

  componentDidMount() {
    this.props.scrollValue.addListener(this.updateView);
  },

  updateView(offset) {
    const position = Math.floor(offset.value);
    const pageOffset = offset.value % 1;
    const tabCount = this.props.tabs.length;
    const lastTabPosition = tabCount - 1;

    if (tabCount === 0 || offset.value < 0 || offset.value > lastTabPosition) {
      return;
    }

    if (this.necessarilyMeasurementsCompleted(position, position === lastTabPosition)) {
      this.updateTabPanel(position, pageOffset);
      this.updateTabUnderline(position, pageOffset, tabCount);
    }
  },

  necessarilyMeasurementsCompleted(position, isLastTab) {
    return this._tabsMeasurements[position] &&
      (isLastTab || this._tabsMeasurements[position + 1]) &&
      this._tabContainerMeasurements &&
      this._containerMeasurements;
  },

  updateTabPanel(position, pageOffset) {
    const containerWidth = this._containerMeasurements.width;
    const tabWidth = this._tabsMeasurements[position].width;
    const nextTabMeasurements = this._tabsMeasurements[position + 1];
    const nextTabWidth = nextTabMeasurements && nextTabMeasurements.width || 0;
    const tabOffset = this._tabsMeasurements[position].left;
    const absolutePageOffset = pageOffset * tabWidth;
    let newScrollX = tabOffset + absolutePageOffset;

    // center tab and smooth tab change (for when tabWidth changes a lot between two tabs)
    newScrollX -= (containerWidth - (1 - pageOffset) * tabWidth - pageOffset * nextTabWidth) / 2;
    newScrollX = newScrollX >= 0 ? newScrollX : 0;

    if (Platform.OS === 'android') {
      this._scrollView.scrollTo({x: newScrollX, y: 0, animated: false,});
    } else {
      const rightBoundScroll = this._tabContainerMeasurements.width - (this._containerMeasurements.width);
      newScrollX = newScrollX > rightBoundScroll ? rightBoundScroll : newScrollX;
      this._scrollView.scrollTo({x: newScrollX, y: 0, animated: false,});
    }

  },

  updateTabUnderline(position, pageOffset, tabCount) {
    const lineLeft = this._tabsMeasurements[position].left;
    const lineRight = this._tabsMeasurements[position].right;

    if (position < tabCount - 1) {
      const nextTabLeft = this._tabsMeasurements[position + 1].left;
      const nextTabRight = this._tabsMeasurements[position + 1].right;

      const newLineLeft = (pageOffset * nextTabLeft + (1 - pageOffset) * lineLeft);
      const newLineRight = (pageOffset * nextTabRight + (1 - pageOffset) * lineRight);

      this.state._leftTabUnderline.setValue(newLineLeft);
      this.state._widthTabUnderline.setValue(newLineRight - newLineLeft);
    } else {
      this.state._leftTabUnderline.setValue(lineLeft);
      this.state._widthTabUnderline.setValue(lineRight - lineLeft);
    }
  },

  renderTab(name, page, isTabActive, onPressHandler, onLayoutHandler) {
    const {activeTextColor, inactiveTextColor, textStyle,} = this.props;
    const textColor = isTabActive ? activeTextColor : inactiveTextColor;
    const fontWeight = isTabActive ? 'bold' : 'normal';

    return <Button
      key={`${name}_${page}`}
      accessible={true}
      accessibilityLabel={name}
      accessibilityTraits='button'
      onPress={() => onPressHandler(page)}
      onLayout={onLayoutHandler}
    >
      <View style={[styles.tab, this.props.tabStyle, ]}>
        <Text style={[{color: textColor, fontWeight, }, textStyle, ]}>
          {name}
        </Text>
      </View>
    </Button>;
  },

  measureTab(page, event) {
    const {x, width, height,} = event.nativeEvent.layout;
    this._tabsMeasurements[page] = {left: x, right: x + width, width, height,};
    this.updateView({value: this.props.scrollValue._value,});
  },

  renderLeftMask(){
    return (
      <View
        style={[styles.maskImg,{left:0,opacity:this.state._showLeftMask?1:0}]}
        pointerEvents='none'
      >
        <Image style={{resizeMode:'stretch'}} source={this.maskImageSrc.left}/>
      </View>
    )
  },

  renderRightMask(){

    return (
      <View
        style={[styles.maskImg,{right:0,opacity:this.state._showRightMask?1:0}]}
        pointerEvents='none'
      >
        <Image style={{resizeMode:'stretch'}} source={this.maskImageSrc.right}/>
      </View>
    )
  },

  showLeftMask(disable){
    if (disable !== this.state._showLeftMask) this.setState({_showLeftMask: disable});
  },

  showRightMask(disable){
    if (disable !== this.state._showRightMask) this.setState({_showRightMask: disable});
  },

  onScroll({nativeEvent:{contentOffset:{x}}}){
    this.props.onScroll && this.props.onScroll(...arguments)

    if (x >= MASK_WIDTH && !this.state._showLeftMask) {
      this.showLeftMask(true)
    } else if (x <= MASK_WIDTH && this.state._showLeftMask) {
      this.showLeftMask(false)
    }

    if (x >= this._tabContainerMeasurements.width - MASK_WIDTH - WINDOW_WIDTH && this.state._showRightMask) {
      this.showRightMask(false)
    } else if (x <= this._tabContainerMeasurements.width - MASK_WIDTH - WINDOW_WIDTH && !this.state._showRightMask) {
      this.showRightMask(true)
    }
  },

  render() {
    const tabUnderlineStyle = {
      position: 'absolute',
      height: 4,
      backgroundColor: 'navy',
      bottom: 0,
    };

    const dynamicTabUnderline = {
      left: this.state._leftTabUnderline,
      width: this.state._widthTabUnderline,
    };

    return (

      <View
        style={[styles.container, {backgroundColor: this.props.backgroundColor, }, this.props.style, ]}
        onLayout={this.onContainerLayout}
      >

        <ScrollView
          automaticallyAdjustContentInsets={false}
          ref={(scrollView) => { this._scrollView = scrollView; }}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled={true}
          onScroll={this.onScroll}
          bounces={false}
          scrollsToTop={false}
        >
          <View
            style={[styles.tabs, {width: this.state._containerWidth }, this.props.tabsContainerStyle, ]}
            ref={'tabContainer'}
            onLayout={this.onTabContainerLayout}
          >
            {this.props.tabs.map((name, page) => {
              const isTabActive = this.props.activeTab === page;
              const renderTab = this.props.renderTab || this.renderTab;
              return renderTab(name, page, isTabActive, this.props.goToPage, this.measureTab.bind(this, page));
            })}
            <Animated.View style={[tabUnderlineStyle, dynamicTabUnderline, this.props.underlineStyle]}>
              <View style={this.props.underlineContainerStyle}/>
            </Animated.View>
          </View>
        </ScrollView>
        {this.props.showMask && this.renderLeftMask()}
        {this.props.showMask && this.renderRightMask()}
      </View>
    );
  },

  componentWillReceiveProps(nextProps) {
    // If the tabs change, force the width of the tabs container to be recalculated
    if (JSON.stringify(this.props.tabs) !== JSON.stringify(nextProps.tabs) && this.state._containerWidth) {
      this.setState({_containerWidth: null,});
    }
  },

  onTabContainerLayout(e) {
    this._tabContainerMeasurements = e.nativeEvent.layout;
    let width = this._tabContainerMeasurements.width;
    if (width < WINDOW_WIDTH) {
      width = WINDOW_WIDTH;
    } else {
      this.setState({_showRightMask: true});
    }
    this.setState({_containerWidth: width,});
    this.updateView({value: this.props.scrollValue._value,});
  },

  onContainerLayout(e) {
    this._containerMeasurements = e.nativeEvent.layout;
    this.updateView({value: this.props.scrollValue._value,});
  },
});

module.exports = ScrollableTabBar;

const styles = StyleSheet.create({
  tab: {
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
  },
  container: {
    height: 50,
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ccc',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  maskImg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  }
});
