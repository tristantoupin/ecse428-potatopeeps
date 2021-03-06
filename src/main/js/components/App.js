'use strict';

/** ----- NPM PACKAGE IMPORTS -----**/
import React from "react"; // Imports the ReactJS Library; Link: https://reactjs.org/
import {Route, NavLink, Switch} from "react-router-dom"; // Imports the React-Router Elements mentioned in Index.js
import {CSSTransition, TransitionGroup} from "react-transition-group";

const root = "/api"; // Root is a variable used to provide pathing to the uriListConverter

/** ----- COMPONENT IMPORTS -----**/
import {Login, SelectTask} from "./Login";
import {Staff, StaffOrders, StaffRequests, StaffLanding} from "./Staff";
import {Manager} from "./Manager";
import {Customer, CustomerMenu, CustomerLandingPage, CustomerCartPage, CustomerReviewBill} from "./Customer";

/** ----- TUTORIAL API IMPORTS -----**/
import follow from "../follow";
import client from "../client";
import when from "when";

/** ----- CSS/STYLING IMPORTS -----**/
import "../../resources/static/css/route-transition.css";

/**
 * This file is the React JS equivalent of Java's 'main' method, and holds the majority of
 * our generic business logic (Creating, Updating, Deleting resources).
 *
 * The state of this Component contains and should contain virtually all of the information we intend on storing
 * about the application - this includes DiningSessions, MenuItems, Orders and Tags. Do note that if we decide to add
 * further database tables, we will have to update the methods below accordingly.
 *
 * This information is then passed or 'sent' to the components we have instantiated as Routes, specifically the
 * Customer.js, Manager.js, Staff.js. This *named* information sent to these components is subsequently
 * accessed in each via their props variable. See documentation below for further explanation.
 *
 * Link to ReactJS Documentation on State: https://reactjs.org/docs/state-and-lifecycle.html
 * Link to ReactJS Documentation on Components & Props: https://reactjs.org/docs/components-and-props.html
 *
 * @Author Evan Bruchet, Gabriel Negash
 * */

export class App extends React.Component {

    /**
     * The constructor below instantiates each of the state variables mentioned previously. These variables are then
     * selectively sent to the components Customer, Manager, Staff. Note some of these variables are NOT passed to the
     * Route components as they don't require all these variables. (Manager does not need to see DiningSessions for ex.)
     * */
    constructor(props) {
        super(props);
        this.state = {
            diningSessions: [],
            diningSessionLinks: {},
            diningSessionAttributes: [],
            menuItems: [],
            menuItemLinks: {},
            menuItemAttributes: [],
            menuItemTags: [],
            orders: [],
            orderLinks: {},
            orderAttributes: [],
            tags: [],
            tagLinks: {},
            tagAttributes: [],
            pageSize: 10,
            selectedTableNumber: 1,
            sentObject: {tableNum: 1, ordersToBeCreated: []},
            billObject: {
                billTotal: 0, ordersCreated: [],
                customerSelectedTableNumber: 0
            },
            diningSession: {}
        };
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
        this.updatePageSize = this.updatePageSize.bind(this);
        this.filterMenuItemList = this.filterMenuItemList.bind(this);
        this.filterDiningSessionList = this.filterDiningSessionList.bind(this);
        this.loadResourceFromServer = this.loadResourceFromServer.bind(this);
        this.updateCustomerCart = this.updateCustomerCart.bind(this);
        this.updateOrderQuantity = this.updateOrderQuantity.bind(this);
        this.removeCartItem = this.removeCartItem.bind(this);
        this.submitOrders = this.submitOrders.bind(this);
        this.customerSelectTableNumber = this.customerSelectTableNumber.bind(this);
        this.customerRequestsBill = this.customerRequestsBill.bind(this);
        this.customerSetDiningSession = this.customerSetDiningSession.bind(this);
    }


    /**
     * loadResourceFromServer - Initializes / updates the state variables mentioned above with the appropriate values.
     * Generally called upon loading of a page, or after Creating/Updating/Deleting a resource, so the View has an up
     * to date view of the database.
     *
     * @param resourceType - A string sent describing which of the resources the sub-component wishes to 'load'. Note
     * the possible values are 'diningSessions', 'menuItems', 'orders', 'tags' as these are how we currently reference
     * our database tables via URI.
     * @param pageSize - Simply denotes the number of entries to return.
     *
     * Link to ReactJS/Spring DATA REST Tutorial: https://spring.io/guides/tutorials/react-and-spring-data-rest/#react-and-spring-data-rest-part-2
     */
    loadResourceFromServer(resourceType, pageSize) {
        follow(client, root, [
            {rel: resourceType, params: {size: pageSize}}]
        ).then(resourceCollection => {
            return client({
                method: 'GET',
                path: resourceCollection.entity._links.profile.href,
                headers: {'Accept': 'application/schema+json'}
            }).then(resourceSchema => {
                switch (resourceType) {
                    case('diningSessions'):
                        this.diningSessionSchema = resourceSchema.entity;
                        this.diningSessionLinks = resourceCollection.entity._links;
                        break;
                    case('menuItems'):
                        this.menuItemSchema = resourceSchema.entity;
                        this.menuItemLinks = resourceCollection.entity._links;
                        break;
                    case('orders'):
                        this.orderSchema = resourceSchema.entity;
                        this.orderLinks = resourceCollection.entity._links;
                        break;
                    case('tags'):
                        this.tagSchema = resourceSchema.entity;
                        this.tagLinks = resourceCollection.entity._links;
                        break;
                }
                return resourceCollection;
            });
        }).then(resourceCollection => {
            switch (resourceType) {
                case('diningSessions'):
                    return resourceCollection.entity._embedded.diningSessions.map(diningSession =>
                        client({
                            method: 'GET',
                            path: diningSession._links.self.href
                        })
                    );
                case('menuItems'):
                    return resourceCollection.entity._embedded.menuItems.map(menuItem =>
                        client({
                            method: 'GET',
                            path: menuItem._links.self.href
                        })
                    );
                case('orders'):
                    return resourceCollection.entity._embedded.orders.map(order =>
                        client({
                            method: 'GET',
                            path: order._links.self.href
                        })
                    );
                case('tags'):
                    return resourceCollection.entity._embedded.tags.map(tag =>
                        client({
                            method: 'GET',
                            path: tag._links.self.href
                        })
                    );
            }
        }).then(resourcePromises => {
            return when.all(resourcePromises);
        }).done(resources => {
            switch (resourceType) {
                case('diningSessions'):
                    this.setState({
                        diningSessions: resources,
                        diningSessionAttributes: Object.keys(this.diningSessionSchema.properties),
                        pageSize: pageSize,
                        diningSessionLinks: this.diningSessionLinks
                    });
                    break;
                case('menuItems'):
                    this.resourceTags = [];
                    this.setState({menuItemTags: []});
                    resources.forEach(resource => {
                        fetch(resource.entity._links.tags.href, {
                            method: 'GET',
                            headers: {'Content-Type': 'application/schema+json'}
                        })
                            .then(
                                response => {
                                    response.json().then((data) => {
                                        let menuItemTagsTemp = this.state.menuItemTags;
                                        let resourceTags = data._embedded.tags.map(tag => tag.name);
                                        let newMenuItemTag = {menuItem: resource, tags: resourceTags};

                                        Promise.resolve(newMenuItemTag).then(value => {
                                            if (menuItemTagsTemp.indexOf(value) === -1)
                                                menuItemTagsTemp.push(value);
                                            this.setState({menuItemTags: menuItemTagsTemp});
                                        });
                                    });
                                }
                            )
                            .catch(function (err) {
                                console.log('Fetch Error :-S', err);
                            });
                    });
                    this.setState({
                        menuItems: resources,
                        menuItemAttributes: Object.keys(this.menuItemSchema.properties).filter(attribute => attribute !== 'tags' && attribute !== 'orders'),
                        pageSize: pageSize,
                        menuItemLinks: this.menuItemLinks
                    });
                    break;
                case('tags'):
                    this.setState({
                        tags: resources,
                        tagAttributes: Object.keys(this.tagSchema.properties).filter(attribute => attribute !== 'menuItems'),
                        pageSize: pageSize,
                        tagLinks: this.tagLinks
                    });
                    break;
                case('orders'):
                    this.setState({
                        orders: resources,
                        orderAttributes: Object.keys(this.orderSchema.properties),
                        pageSize: pageSize,
                        orderLinks: this.orderLinks
                    });
                    break;
            }
        });
    }

    updateDiningSession(diningSession, updatedDiningSession, option, string) {

        updatedDiningSession['tableNumber'] = diningSession.entity.tableNumber;
        switch (option) {
            case 'diningSessionStatus':
                updatedDiningSession['diningSessionStatus'] = string;
                break;
            case 'serviceRequestStatus':
                updatedDiningSession['serviceRequestStatus'] = string;
                break;
            case 'billRequestStatus':
                updatedDiningSession['billRequestStatus'] = string;
                break;
            case 'tableAssignmentStatus':
                updatedDiningSession['tableAssignmentStatus'] = string;
                break;
        }
    }

    /**
     *  Function to filter a list DiningSessions, to be used by Customer (TableNumberSelect) & Staff
     * @param option, defaulted to column name from DiningSession but holds no importance
     *              Note: option must be passed in as a single 'qoute' not "qoute"
     * @returns {Array} holding the filtered diningsessions
     * @see Customer.js, Staff.js, DiningSession.java
     * @author Gabriel
     *
     * TODO: validate props vs state, modify br_status & sr_status
     */
    filterDiningSessionList(option) {
        let filteredList = [];
        switch (option) {
            case 'ta_status':
                filteredList = this.state.diningSessions.filter(
                    session => session.entity.tableAssignmentStatus === "UNASSIGNED");
                break;
            case 'br_status':
                filteredList = this.state.diningSessions.filter(
                    session => session.entity.billRequestStatus === "ACTIVE");
                break;
            case 'sr_status':
                filteredList = this.state.diningSessions.filter(
                    session => session.entity.serviceRequestStatus === "ACTIVE");
                break;

            default: //invalid option for filtering return all
                console.log("ERROR: Invalid option for filterDiningSessionList returning default");
                filteredList = this.state.diningSessions;
        }

        return filteredList
    }

    filterMenuItemList(selectedView, selectedTags) {
        let validMenuItems;
        if (selectedTags.length === 0) {
            this.setState({menuItems: []});
            this.loadResourceFromServer('menuItems', this.state.pageSize);
            return Promise.resolve(this.state.menuItemTags); //TODO: Return MenuItems not MenuItemTags
        } else {
            switch (selectedView) {
                case('Customer'):
                    validMenuItems = this.state.menuItemTags
                        .filter(menuItemTag => selectedTags
                            .every(e => menuItemTag.tags.map(tag => tag)
                                .includes(e))).map(menuItemTag => menuItemTag.menuItem);
                    return Promise.resolve(validMenuItems)
                        .then(validMenuItems => {
                            this.setState({menuItems: validMenuItems});
                            return validMenuItems;
                        });
                case('Manager'):
                    validMenuItems = this.state.menuItemTags
                        .filter(menuItemTag =>
                            selectedTags.map(selTag => selTag.label)
                                .every(e => menuItemTag.tags.map(tag => tag)
                                    .includes(e))).map(menuItemTag => menuItemTag.menuItem);
                    return Promise.resolve(validMenuItems)
                        .then(validMenuItems => {
                            this.setState({menuItems: validMenuItems});
                            return validMenuItems;
                        });
            }
        }
    }

    /**
     * onCreate - Creates and inserts the passed resource into the database, then refreshes the state's view of the table.
     * @param newResource - A JS Object, describing the resource to be created.
     * @param resourceType - A string describing which of the resource tables the sub-component wishes to insert into.
     *
     * @author Ryan Dotsikas, Evan Bruchet
     */
    onCreate(newResource, resourceType) {
        follow(client, root, [resourceType]).then(response => {
            return client({
                method: 'POST',
                path: response.entity._links.self.href,
                entity: newResource,
                headers: {'Content-Type': 'application/json'}
            })
        }).then(() => {
            return follow(client, root, [
                {rel: resourceType, params: {'size': this.state.pageSize}}]);
        }).done(response => {
            if (typeof response.entity._links.last !== "undefined") {
                this.onNavigate(response.entity._links.last.href, resourceType);
            } else {
                this.onNavigate(response.entity._links.self.href, resourceType);
            }
        });
    }

    /**
     * onUpdate - Updates the passed resource in the database, assuming present - then refreshes state's view of the table.
     * @param resource - A JS Object, describing the resource to be updated.
     * @param updatedResource - The JS Object with new properties describing the resource to be updated.
     * @param resourceType - A string sent describing which of the resource tables the sub-component wishes to update
     * Note the possible values are 'diningSessions', 'menuItems', 'orders', 'tags' as these are our currently
     * existing database tables, and how they are referenced via URI.
     *
     * @author Gabriel Negash, Evan Bruchet
     */
    onUpdate(resource, updatedResource, resourceType) {
        client({
            method: 'PATCH',
            path: resource.entity._links.self.href,
            entity: updatedResource,
            headers: {
                'Content-Type': 'application/json'
            }
        }).done(() => {
            this.loadResourceFromServer(resourceType, this.state.pageSize);
        }, response => {
            if (response.status.code === 412) {
                alert('DENIED: Unable to update ' +
                    resource.entity._links.self.href + '. Your copy is stale.');
            }
        });
    }

    /**
     * onDelete - Deletes the passed resource from the database, then refreshes the state's view of the table.
     *
     * @param deletedResource - A JS Object, describing the resource to be deleted.
     * @param resourceType - A string sent describing which of the resource tables the sub-component wishes to delete
     * from. Note the possible values are 'diningSessions', 'menuItems', 'orders', 'tags' as these are our currently
     * existing database tables, and how they are referenced via URI.
     *
     * @author Ryan Dotsikas, Evan Bruchet
     */
    onDelete(deletedResource, resourceType) {
        client({method: 'DELETE', path: deletedResource.entity._links.self.href}).done(() => {
            switch (resourceType) {
                case('diningSessions'):
                    this.loadResourceFromServer('diningSessions', this.state.pageSize);
                    break;
                case('menuItems'):
                    this.loadResourceFromServer('menuItems', this.state.pageSize);
                    break;
                case('orders'):
                    this.loadResourceFromServer('orders', this.state.pageSize);
                    break;
                case('tags'):
                    this.loadResourceFromServer('tags', this.state.pageSize);
                    break;
            }
        });
    }

    /**
     * onNavigate - Called in the onCreate function to force a navigation to the final page of the table to see the
     * newly inserted resource.
     *
     * @param navUri - The URI upon which a GET Request is performed.
     * @param resourceType - A string sent describing which of the resource tables the sub-component wishes to navigate
     * to. Note the possible values are 'diningSessions', 'menuItems', 'orders', 'tags' as these are our currently
     * existing database tables, and how they are referenced via URI.
     *
     * @author Ryan Dotsikas, Evan Bruchet
     */
    onNavigate(navUri, resourceType) {
        client({
            method: 'GET', path: navUri
        }).then(resourceCollection => {
            switch (resourceType) {
                case('diningSessions'):
                    this.diningSessionLinks = resourceCollection.entity._links;
                    return resourceCollection.entity._embedded.diningSessions.map(diningSession =>
                        client({
                            method: 'GET',
                            path: diningSession._links.self.href
                        })
                    );
                case('menuItems'):
                    this.menuItemLinks = resourceCollection.entity._links;
                    return resourceCollection.entity._embedded.menuItems.map(menuItem =>
                        client({
                            method: 'GET',
                            path: menuItem._links.self.href
                        })
                    );
                case('orders'):
                    this.orderLinks = resourceCollection.entity._links;
                    return resourceCollection.entity._embedded.orders.map(order =>
                        client({
                            method: 'GET',
                            path: order._links.self.href
                        })
                    );
                case('tags'):
                    this.tagLinks = resourceCollection.entity._links;
                    return resourceCollection.entity._embedded.tags.map(tag =>
                        client({
                            method: 'GET',
                            path: tag._links.self.href
                        })
                    );
            }
        }).then(resourcePromises => {
            return when.all(resourcePromises);
        }).done(resources => {
            switch (resourceType) {
                case('diningSessions'):
                    this.setState({
                        diningSessions: resources,
                        diningSessionAttributes: Object.keys(this.diningSessionSchema.properties),
                        pageSize: this.state.pageSize,
                        diningSessionLinks: this.diningSessionLinks
                    });
                    break;
                case('menuItems'):
                    this.setState({
                        menuItems: resources,
                        menuItemAttributes: Object.keys(this.menuItemSchema.properties).filter(attribute => attribute !== 'tags' && attribute !== 'orders'),
                        pageSize: this.state.pageSize,
                        menuItemLinks: this.menuItemLinks
                    });
                    break;
                case('orders'):
                    this.setState({
                        orders: resources,
                        orderAttributes: Object.keys(this.orderSchema.properties),
                        pageSize: this.state.pageSize,
                        orderLinks: this.orderLinks
                    });
                    break;
                case('tags'):
                    this.setState({
                        tagItems: resources,
                        tagAttributes: Object.keys(this.tagSchema.properties).filter(attribute => attribute !== 'menuItems'),
                        pageSize: this.state.pageSize,
                        tagLinks: this.tagLinks
                    });
                    break;
            }
        });
    }

    updatePageSize(pageSize, resourceType) {
        if (pageSize !== this.state.pageSize) {
            this.loadResourceFromServer(resourceType, pageSize);
        }
    }

    updateCustomerCart(menuItem) {
        let oldSentObject = this.state.sentObject;
        let oldOrdersToBeCreated = [];
        oldOrdersToBeCreated = oldSentObject.ordersToBeCreated;

        let alreadyExists = false;

        oldOrdersToBeCreated.forEach((oldOrderToBeCreated) => {
            if (oldOrderToBeCreated.name === menuItem.entity.name) {
                alreadyExists = true;
            }
        });

        if (!alreadyExists) {
            let orderToBeCreated = {};
            orderToBeCreated['quantity'] = 1;
            orderToBeCreated['name'] = menuItem.entity.name;
            orderToBeCreated['price'] = menuItem.entity.price;
            orderToBeCreated['orderTotal'] = menuItem.entity.price;
            orderToBeCreated['menuItemHref'] = menuItem.entity._links.self.href;
            oldOrdersToBeCreated.push(orderToBeCreated);

            let cartTotal = 0;
            oldOrdersToBeCreated.forEach(function (oldOrder) {
                cartTotal += oldOrder.orderTotal;
            });

            this.setState({
                sentObject: {
                    tableNum: this.state.customerSelectedTableNumber,
                    cartTotal: cartTotal,
                    ordersToBeCreated: oldOrdersToBeCreated
                }
            });
        }
    }

    updateOrderQuantity(quantity, index) {
        let oldOrdersToBeCreated = this.state.sentObject.ordersToBeCreated;
        let name = oldOrdersToBeCreated[index].name;
        let price = oldOrdersToBeCreated[index].price;
        let href = oldOrdersToBeCreated[index].menuItemHref;
        let orderTotal = price * quantity;
        oldOrdersToBeCreated[index] = {
            quantity: quantity,
            name: name,
            price: price,
            orderTotal: orderTotal,
            menuItemHref: href
        };

        let cartTotal = 0;
        oldOrdersToBeCreated.forEach(function (oldOrder) {
            cartTotal += oldOrder.orderTotal;
        });

        this.setState({
            sentObject: {
                tableNum: this.state.customerSelectedTableNumber,
                cartTotal: cartTotal,
                ordersToBeCreated: oldOrdersToBeCreated
            }
        });
    }


    removeCartItem(e, index) {
        e.preventDefault();
        let oldOrdersToBeCreated = this.state.sentObject.ordersToBeCreated;
        let oldCartTotal = this.state.sentObject.cartTotal;
        let newCartTotal = oldCartTotal - oldOrdersToBeCreated[index].orderTotal;
        oldOrdersToBeCreated.splice(index, 1);

        this.setState({
            sentObject:
                {
                    tableNum: this.state.customerSelectedTableNumber,
                    cartTotal: newCartTotal, ordersToBeCreated: oldOrdersToBeCreated
                }
        });
    }

    submitOrders(e) {
        e.preventDefault();
        let ordersToBeCreated = this.state.sentObject.ordersToBeCreated;
        let diningSessionsLength = this.state.diningSessions.length;
        let diningSessionUrl = "";

        for (let i = 0; i < diningSessionsLength; i++) {
            if (this.state.diningSessions[i].entity.tableNumber === parseInt(this.state.customerSelectedTableNumber, 10))
                diningSessionUrl = this.state.diningSessions[i].entity._links.self.href;
        }

        let cartTotal = 0;

        ordersToBeCreated.forEach((order) => {
            let newOrder = {};
            newOrder['status'] = 'ORDERED';
            newOrder['price'] = order.orderTotal;
            newOrder['quantity'] = order.quantity;
            newOrder['menuItem'] = order.menuItemHref;
            newOrder['diningSession'] = diningSessionUrl;
            cartTotal += order.orderTotal;
            this.onCreate(newOrder, "orders");
        });


        console.log("State Selected Table Number: " + this.state.customerSelectedTableNumber);
        let thisStateSelectedTableNumber = parseInt(this.state.customerSelectedTableNumber, 10);
        console.log("This State Selected Table Number: " + this.state.customerSelectedTableNumber);

        let newBillTotal = this.state.billObject.billTotal + cartTotal;
        let ordersCreated = this.state.billObject.ordersCreated.concat(ordersToBeCreated);

        setTimeout(() => {
            this.setState({sentObject: {tableNum: thisStateSelectedTableNumber, cartTotal: 0, ordersToBeCreated: []}});
            this.setState({
                billObject: {
                    tableNum: thisStateSelectedTableNumber,
                    billTotal: newBillTotal,
                    ordersCreated: ordersCreated
                }
            });
            console.log("Emptied Sent Object: ", this.state.sentObject);
            console.log("Bill Object: ", this.state.billObject);
        }, 1000)

    }


    customerRequestsBill() {

        let diningSessionUrl = "";
        let diningSessionsLength = this.state.diningSessions.length;

        let index = 0;
        for (let i = 0; i < diningSessionsLength; i++) {
            if (this.state.diningSessions[i].entity.tableNumber === parseInt(this.state.customerSelectedTableNumber, 10)) {
                diningSessionUrl = this.state.diningSessions[i].entity._links.self.href;
                index = i;
                break;
            }
        }

        let updatedDiningSession = {};

        updatedDiningSession['tableNumber'] = parseInt(this.state.customerSelectedTableNumber, 10);
        updatedDiningSession['billRequestStatus'] = 'ACTIVE';


        this.onUpdate(this.state.diningSessions[index], updatedDiningSession, 'orders');
        this.setState({
            billObject: {
                billTotal: 0,
                ordersCreated: [],
                customerSelectedTableNumber: parseInt(this.state.customerSelectedTableNumber, 10)
            }
        })


        //    billObject: {billTotal: 0, ordersCreated: [],
        //             customerSelectedTableNumber: 0}
    }

    customerSelectTableNumber(selectedTableNumber) {
        this.setState({customerSelectedTableNumber: selectedTableNumber});
    }

    customerSetDiningSession(diningSession){
        this.setState({diningSession: diningSession})
    }

    /**
     * render - Render a React element into the DOM in the supplied container and return a reference to the component
     *
     * @returns The HTML/JSX code to be displayed by this element. In this case, we return a basic navbar at the top
     * to allow the development team to move between our existing pages easily using <NavLink> components.
     * NOTE: This navbar will be removed by the end of the project.
     *
     * Additionally, this is where we place all of our <Route> component, grouped together by a <Switch> component. This
     * <Switch> component iterates over all its children <Route> elements and renders the first one matching the current
     * URL. We have a Route for each of our 'pages' or views - Login, Customer, Manager and Staff.
     */
    render() {
        return (
            <div className="App">

                <Route render={({location}) => (
                    <TransitionGroup>
                        <CSSTransition key={location.pathname} timeout={30000} classNames="fade">
                            <Switch location={location}>
                                <Route exact path={"/(login)?"} component={Login}/>
                                <Route path={"/customer"} render={(props) =>
                                    (<Customer loadResourceFromServer={this.loadResourceFromServer}
                                               onCreate={this.onCreate}
                                               onUpdate={this.onUpdate}
                                               onDelete={this.onDelete}
                                               onNavigate={this.onNavigate}
                                               customerSetDiningSession={this.customerSetDiningSession}
                                               customerSelectTableNumber={this.customerSelectTableNumber}
                                               filterDiningSessionList={this.filterDiningSessionList}
                                               diningSessions={this.state.diningSessions}
                                               diningSessionLinks={this.state.diningSessionLinks}
                                               filterMenuItemList={this.filterMenuItemList}
                                               menuItems={this.state.menuItems}
                                               menuItemLinks={this.state.menuItemLinks}
                                               menuItemAttributes={this.state.menuItemAttributes}
                                               tags={this.state.tags}
                                               tagLinks={this.state.tagLinks}
                                               tagAttributes={this.state.tagAttributes}
                                               diningSessionAttributes={this.state.diningSessionAttributes}
                                               orders={this.state.orders}
                                               orderLinks={this.state.orderLinks}
                                               orderAttributes={this.state.orderAttributes}
                                               selectedView={'Customer'}
                                               {...props}/>)}/>
                                <Route path={"/manager"} render={(props) =>
                                    (<Manager loadResourceFromServer={this.loadResourceFromServer}
                                              onCreate={this.onCreate}
                                              onUpdate={this.onUpdate}
                                              onDelete={this.onDelete}
                                              onNavigate={this.onNavigate}
                                              filterMenuItemList={this.filterMenuItemList}
                                              menuItems={this.state.menuItems}
                                              menuItemLinks={this.state.menuItemLinks}
                                              menuItemAttributes={this.state.menuItemAttributes}
                                              tags={this.state.tags}
                                              tagLinks={this.state.tagLinks}
                                              tagAttributes={this.state.tagAttributes}
                                              selectedView={'Manager'}
                                              {...props}/>)}/>
                                <Route path={"/staff"} render={(props) =>
                                    (<Staff loadResourceFromServer={this.loadResourceFromServer}
                                                                    onCreate={this.onCreate}
                                                                    onUpdate={this.onUpdate}
                                                                    onDelete={this.onDelete}
                                                                    onNavigate={this.onNavigate}
                                                                    filterDiningSessionList={this.filterDiningSessionList}
                                                                    diningSessions={this.state.diningSessions}
                                                                    diningSessionLinks={this.state.diningSessionLinks}
                                                                    diningSessionAttributes={this.state.diningSessionAttributes}
                                                                    orders={this.state.orders}
                                                                    orderLinks={this.state.orderLinks}
                                                                    orderAttributes={this.state.orderAttributes}
                                                                    selectedView={'Staff'}
                                                                    {...props}/>)}/>
                                <Route path={"/customer-menu"} render={(props) =>
                                    (<CustomerMenu loadResourceFromServer={this.loadResourceFromServer}
                                                                    onCreate={this.onCreate}
                                                                    onUpdate={this.onUpdate}
                                                                    onDelete={this.onDelete}
                                                                    onNavigate={this.onNavigate}
                                                                    diningSessions={this.state.diningSessions}
                                                                    diningSessionLinks={this.state.diningSessionLinks}
                                                                    diningSessionAttributes={this.state.diningSessionAttributes}
                                                                    orders={this.state.orders}
                                                                    orderLinks={this.state.orderLinks}
                                                                    orderAttributes={this.state.orderAttributes}
                                                                    menuItemTags={this.state.menuItemTags}
                                                                    selectedView={'Customer'}
                                                                    updateCustomerCart={this.updateCustomerCart}
                                                                    updateOrderQuantity={this.updateOrderQuantity}
                                                                    filterMenuItemList={this.filterMenuItemList}
                                                                    {...props}/>)}/>
                                <Route path={"/CustomerLanding"} render={(props) =>
                                    (<CustomerLandingPage loadResourceFromServer={this.loadResourceFromServer}
                                                          onCreate={this.onCreate}
                                                          onUpdate={this.onUpdate}
                                                          onDelete={this.onDelete}
                                                          diningSession={this.state.diningSession}
                                                          updateDiningSession={this.updateDiningSession}
                                                          onNavigate={this.onNavigate}
                                                          diningSessions={this.state.diningSessions}
                                                          diningSessionLinks={this.state.diningSessionLinks}
                                                          diningSessionAttributes={this.state.diningSessionAttributes}
                                                          orders={this.state.orders}
                                                          orderLinks={this.state.orderLinks}
                                                          orderAttributes={this.state.orderAttributes}
                                                          menuItems={this.state.menuItems}
                                                          menuItemTags={this.state.menuItemTags}
                                                          tags={this.state.tags}
                                                          updateCustomerCart={this.updateCustomerCart}
                                                          updateOrderQuantity={this.updateOrderQuantity}
                                                          sentObject={this.state.sentObject}
                                                          selectedView={'Customer'}
                                                          filterMenuItemList={this.filterMenuItemList}
                                                          {...props}/>)}/>


                                <Route path={"/customer-review-bill"} render={(props) =>
                                    (<CustomerReviewBill loadResourceFromServer={this.loadResourceFromServer}
                                                         onCreate={this.onCreate}
                                                         onUpdate={this.onUpdate}
                                                         onDelete={this.onDelete}
                                                         onNavigate={this.onNavigate}
                                                         customerRequestsBill={this.customerRequestsBill}
                                                         diningSessions={this.state.diningSessions}
                                                         diningSessionLinks={this.state.diningSessionLinks}
                                                         diningSessionAttributes={this.state.diningSessionAttributes}
                                                         orders={this.state.orders}
                                                         orderLinks={this.state.orderLinks}
                                                         orderAttributes={this.state.orderAttributes}
                                                         menuItems={this.props.menuItems}
                                                         menuItemTags={this.state.menuItemTags}
                                                         tags={this.state.tags}
                                                         updateCustomerCart={this.updateCustomerCart}
                                                         updateOrderQuantity={this.updateOrderQuantity}
                                                         sentObject={this.state.sentObject}
                                                         billObject={this.state.billObject}
                                                         selectedView={'Customer'}
                                                         filterMenuItemList={this.filterMenuItemList}
                                                         {...props}/>)}/>
                                <Route path={"/customer-view-cart"} render={(props) =>
                                    (<CustomerCartPage loadResourceFromServer={this.loadResourceFromServer}
                                                       onCreate={this.onCreate}
                                                       onUpdate={this.onUpdate}
                                                       onDelete={this.onDelete}
                                                       removeCartItem={this.removeCartItem}
                                                       updateDiningSession={this.updateDiningSession}
                                                       onNavigate={this.onNavigate}
                                                       updateCustomerCart={this.updateCustomerCart}
                                                       updateOrderQuantity={this.updateOrderQuantity}
                                                       submitOrders={this.submitOrders}
                                                       sentObject={this.state.sentObject}
                                                       diningSessions={this.state.diningSessions}
                                                       diningSessionLinks={this.state.diningSessionLinks}
                                                       diningSessionAttributes={this.state.diningSessionAttributes}
                                                       orders={this.state.orders}
                                                       orderLinks={this.state.orderLinks}
                                                       orderAttributes={this.state.orderAttributes}
                                                       menuItems={this.props.menuItems}
                                                       menuItemTags={this.state.menuItemTags}
                                                       tags={this.state.tags}
                                                       selectedView={'Customer'}
                                                       filterMenuItemList={this.filterMenuItemList}
                                                       {...props}/>)}/>
                                <Route exact path={"/selectTask"} component={SelectTask}/>
                                <Route exact path={"/staff-landing"} component={StaffLanding}/>
                                <Route exact path={"/staff-requests"} component={StaffRequests}/>
                                <Route exact path={"/staff-orders"} component={StaffOrders}/>
                            </Switch>
                        </CSSTransition>
                    </TransitionGroup>
                )}/>
            </div>
        )
    }
}