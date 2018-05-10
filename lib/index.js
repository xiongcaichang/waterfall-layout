import React, {PropTypes} from "react";
import { ScrollView, View } from "react-native";
import FlatList from 'rnx-flatlist';
import PullRefreshScrollView from './PullRefreshScrollView'

class Item extends React.PureComponent {

	shouldComponentUpdate(nextProps) {
		return nextProps.item.postId !== this.props.item.postId
	}
	render() {
		return <View style={{ flex: 1 }} onLayout={this.props.onLayout}>
			{this.props.renderItem( this.props.item )}
		</View>
	}
}

class Column extends React.Component {
	static propTypes = {
		keyExtractor: PropTypes.func
	};

	constructor( props ) {
		super( props );
		this.state = {
			height: 0,
			data: []
		};
	}

	clear() {
		this.setState( { data: [], height: 0 } );
	}

	render() {
		const { index, totalColumn } = this.props;
		return <View style={[{ flex: 1, overflow: "hidden" }, !index && {paddingLeft: 15}, (totalColumn - index === 1) && {paddingRight: 15}]}>
			<FlatList
				style={{ flex: 1 }}
				data={this.state.data}
				keyExtractor={this.props.keyExtractor}
				renderItem={this.renderItem.bind( this )}
			/>
		</View>
	}

	getHeight() {
		return this.state.height;
	}

	addItems( items ) {
		this.setState( { data: [ ...this.state.data, ...items ] } );
	}

	renderItem( { item } ) {
		return <Item renderItem={this.props.renderItem} item={item} onLayout={( event ) => {
			const { height } = event.nativeEvent.layout;
			this.state.height = this.state.height + height;
			this.setState( { height: this.state.height } );
			item.onLayout && item.onLayout();
		}}/>
	}
}

export default class Masonry extends React.Component {


	constructor( props ) {
		super( props );
		const columns = [];
		for ( let i = 0; i < props.columns; i++ ) {
			columns.push( null );
		}
		this.state = {
			columns
		};
		this.itemQueue = [];
	}

	clear() {
		this.state.columns.forEach( col => col.clear() );
	}

	addItems( items ) {
		if ( items ) {
			if ( this.itemQueue.length > 0 ) {
				this.itemQueue = this.itemQueue.concat( items );
			} else {
				this.itemQueue = this.itemQueue.concat( items );
				this.addItems();
			}
		} else {
			if ( this.itemQueue.length > 0 ) {
				const item = this.itemQueue.shift();
				this.addItem( item, () => this.addItems() );
			}
		}
	}

	addItemsWithHeight( items ) {
		// 生成临时 Column 映射
		const columns = this.sortColumns().map( col => {
			return {
				column: col,
				height: col.getHeight(),
				data: []
			}
		} );

		// 逐个分配 Item 到最小的 Column 中
		items.forEach( ( item ) => {
			const col = columns.sort( ( a, b ) => a.height - b.height )[ 0 ];
			col.data.push( item );
			col.height += item.height;
		} );

		// 批量添加 Column 的 Items
		columns.forEach( col => {
			col.column.addItems( col.data );
		} )
	}

	/**
	 * 对所有列按高度进行排序
	 * @returns {Array}
	 */
	sortColumns() {
		return this.state.columns.sort( ( a, b ) => a.getHeight() - b.getHeight() );
	}

	addItem( item, callback ) {
		const minCol = this.sortColumns()[ 0 ];
		item.onLayout = callback;
		minCol.addItems( [ item ] );
	}


	componentWillReceiveProps(props) {
		if (props.initData && this.itemQueue.length === 0) {
			if (!this.initDataLoad) {
				this.initDataLoad = true;
				this.addItemsWithHeight(props.initData);
			}
			
		}
	}

	render() {
		return <PullRefreshScrollView
		 {...this.props}
		 
		 >
			<View style={[ { flexDirection: "row" }, this.props.containerStyle ]}>
				{this.state.columns.map( ( col, index ) => {
					return <Column key={index} index={index} ref={( ref ) => this.state.columns[ index ] = ref}
								   totalColumn={this.props.columns}
								   keyExtractor={this.props.keyExtractor}
								   renderItem={this.props.renderItem.bind( this )}/>
				} )}
			</View>
		</PullRefreshScrollView>
	}

}


Masonry.propTypes = {
	columns: PropTypes.number,
	containerStyle: View.propTypes.style,
	style: View.propTypes.style,
	renderItem: PropTypes.func,
	keyExtractor: PropTypes.func,
};
Masonry.defaultProps = {
	columns: 2
};