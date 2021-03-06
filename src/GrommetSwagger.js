import React, { Component } from 'react';
import { Redirect, Router, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { createBrowserHistory } from 'history';
import jsyaml from 'js-yaml';
import { Grommet, hpe as hpeTheme } from 'grommet';
import Choose from './Choose';
import Endpoints from './Endpoints';
import Endpoint from './Endpoint';
import Execute from './Execute';
import Loading from './Loading';

const THEMES = {
  hpe: hpeTheme,
};

export default class GrommetSwagger extends Component {
  constructor(props) {
    super(props);
    const history = createBrowserHistory({ basename: props.routePrefix });
    this.state = { history, loading: true, contextSearch: '?' };
  }

  componentDidMount() {
    const { history } = this.state;
    const url = this.props.url || queryString.parse(history.location.search).url;
    const theme = this.props.theme || queryString.parse(history.location.search).theme;
    if (url) {
      this.onLoad(url, theme);
    } else {
      this.onUnload();
      /* eslint-disable react/no-did-mount-set-state */
      this.setState({ theme });
      /* eslint-enable react/no-did-mount-set-state */
    }
  }

  onLoad = (url, theme) => {
    const { history } = this.state;
    const parser = document.createElement('a');
    parser.href = url;
    this.setState({
      data: undefined, error: undefined, loading: true, origin: parser.origin, theme, url,
    });
    fetch(url, { method: 'GET' })
      .then(response => response.text())
      .then(text => jsyaml.load(text))
      .then((data) => {
        document.title = data.info.title;
        this.setState({ data, loading: false });
      })
      .then(() => {
        if (!this.props.url) {
          let contextSearch = `?url=${encodeURIComponent(url)}`;
          if (theme) {
            contextSearch += `&theme=${encodeURIComponent(theme)}`;
          }
          this.setState({ contextSearch });
          if (queryString.parse(history.location.search).url.indexOf(url) === -1) {
            history.replace(contextSearch);
          }
        }
      })
      .catch(error => this.setState({ error: error.message, loading: false }));
  }

  onUnload = () => {
    this.setState({ data: undefined, error: undefined, loading: false });
  }

  render() {
    const { background, executable } = this.props;
    const {
      contextSearch, data, error, history, loading, origin, theme, url,
    } = this.state;
    let content;
    if (loading) {
      content = <Loading />;
    } else {
      content = (
        <Switch>
          <Route
            exact={true}
            path='/'
            render={() => {
              if (!data && !this.props.url) {
                return <Redirect to='/choose' />;
              }
              if (data) {
                return (
                  <Endpoints
                    background={background}
                    contextSearch={contextSearch}
                    data={data}
                    theme={theme}
                    onUnload={!this.props.url ? this.onUnload : undefined}
                  />
                );
              }
              return <span />;
            }}
          />
          <Route
            path='/choose'
            render={() => {
              if (data) {
                return <Redirect to='/' />;
              }
              return (
                <Choose
                  loading={loading}
                  onLoad={this.onLoad}
                  error={error}
                  theme={theme}
                  url={url}
                />
              );
            }}
          />
          <Route
            path='/endpoint'
            render={({ location: { search } }) => {
              if (!data) {
                return <Redirect to={`/${contextSearch}`} />;
              }
              const { path } = queryString.parse(search);
              window.scrollTo(0, 0);
              return (
                <Endpoint
                  contextSearch={contextSearch}
                  data={data}
                  executable={executable}
                  path={path}
                />
              );
            }}
          />
          <Route
            path='/execute'
            render={({ location: { search } }) => {
              if (!data) {
                return <Redirect to={`/${contextSearch}`} />;
              }
              const { methodName, path, subPath } = queryString.parse(search);
              window.scrollTo(0, 0);
              return (
                <Execute
                  contextSearch={contextSearch}
                  data={data}
                  methodName={methodName}
                  origin={origin}
                  path={path}
                  subPath={subPath}
                />
              );
            }}
          />
          <Redirect from='/*' to='/' />
        </Switch>
      );
    }
    return (
      <Router history={history}>
        <Grommet theme={THEMES[theme]}>
          {content}
        </Grommet>
      </Router>
    );
  }
}

GrommetSwagger.propTypes = {
  background: PropTypes.any,
  executable: PropTypes.bool,
  routePrefix: PropTypes.string,
  theme: PropTypes.string,
  url: PropTypes.string,
};

GrommetSwagger.defaultProps = {
  background: undefined,
  executable: true,
  routePrefix: undefined,
  theme: undefined,
  url: undefined,
};
