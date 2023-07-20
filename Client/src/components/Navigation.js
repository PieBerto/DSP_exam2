import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';

import { Navbar, Nav, Form, Button } from 'react-bootstrap';
import { Link, NavLink } from 'react-router-dom';
import { LogoutButton } from './Auth';

const Navigation = (props) => {

  const handleSubmit = (event) => {
    event.preventDefault();
  }

  return (
    <Navbar bg="primary" expand="sm" variant="dark" fixed="top" className="navbar-padding">
      <Link to="/">
        <Navbar.Brand>
        <i className="bi bi-collection-play icon-size"/> Film Manager
        </Navbar.Brand>
      </Link>
      <Nav className="my-2 my-lg-0 mx-auto d-sm-block" aria-label="Quick search" />
      <Nav className="ml-md-auto">
        <Navbar.Text className="mx-2">
          {props.loggedIn ? <Button variant={'light'} onClick={props.reverseSwitchDisable}>{props.switchDisabled ? 'Enable switches' : 'Disable switches'}</Button> : <></>}
        </Navbar.Text>
        <Navbar.Text className="mx-2">
          {props.user && props.user.name && `Welcome, ${props.user.name}!`}
        </Navbar.Text>
        <Form className="mx-2">
          {props.loggedIn ? <LogoutButton logout={props.logout} /> : <></>}
        </Form>
      </Nav>
    </Navbar>
  );

}

export { Navigation }; 